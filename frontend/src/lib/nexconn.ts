/**
 * Thin wrapper around the official Nexconn Chat SDK (@nexconn/chat).
 * All messaging (direct and group) is delivered by Nexconn; this module only adapts its API for the UI.
 * The SDK is loaded on demand so it does not slow down the first page load.
 */
import type { Message } from '@nexconn/chat'
import type { ChatToken } from './types'

export type ChannelKind = 'direct' | 'group'
export interface ChannelRef { kind: ChannelKind; id: string }
export type LinkState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ChatMessage {
  id: string
  channelId: string
  senderId: string
  sentTime: number
  mine: boolean
  kind: 'text' | 'image' | 'file' | 'other'
  text?: string
  url?: string
  name?: string
  status: 'sending' | 'sent' | 'read' | 'failed'
}

type Listener<T> = (v: T) => void

type Sdk = typeof import('@nexconn/chat')
let sdkPromise: Promise<Sdk> | null = null
function loadSdk(): Promise<Sdk> {
  sdkPromise ??= import('@nexconn/chat')
  return sdkPromise
}

class ChatManager {
  private initializedKey: string | null = null
  private state: LinkState = 'idle'
  private userId: string | null = null
  private statusListeners = new Set<Listener<LinkState>>()
  private messageListeners = new Set<Listener<ChatMessage>>()
  private connecting: Promise<void> | null = null
  /** Channel currently open in the UI (used to suppress toasts for messages the user is already reading). */
  activeChannelId: string | null = null

  get status(): LinkState { return this.state }
  get currentUserId(): string | null { return this.userId }

  private setState(s: LinkState) {
    this.state = s
    this.statusListeners.forEach((l) => l(s))
  }

  onStatus(l: Listener<LinkState>): () => void {
    this.statusListeners.add(l)
    return () => this.statusListeners.delete(l)
  }

  onMessage(l: Listener<ChatMessage>): () => void {
    this.messageListeners.add(l)
    return () => this.messageListeners.delete(l)
  }

  /** Initialises the SDK once and connects with the user token issued by our backend. */
  connect(t: ChatToken): Promise<void> {
    if (this.state === 'connected' && this.userId === t.userId) return Promise.resolve()
    if (this.connecting) return this.connecting
    this.connecting = (async () => {
      try {
        this.setState('connecting')
        const { NCEngine, ConnectionStatus, ConnectionStatusHandler, MessageHandler } = await loadSdk()
        if (this.initializedKey !== t.appKey) {
          NCEngine.initialize({ appKey: t.appKey })
          NCEngine.addConnectionStatusHandler(
            'resqlink-status',
            new ConnectionStatusHandler({
              onConnectionStatusChanged: ({ status }) => {
                if (status === ConnectionStatus.CONNECTED) this.setState('connected')
                else if (status === ConnectionStatus.CONNECTING) this.setState('connecting')
                else this.setState('disconnected')
              },
            }),
          )
          const sdkRef = await loadSdk()
          NCEngine.addMessageHandler(
            'resqlink-messages',
            new MessageHandler({
              onMessageReceived: ({ messages }) => {
                for (const m of messages) {
                  const cm = this.normalize(sdkRef, m)
                  this.messageListeners.forEach((l) => l(cm))
                }
              },
            }),
          )
          this.initializedKey = t.appKey
        }
        const res = await NCEngine.connect({ token: t.token })
        if (!res.isOk) throw new Error(`Chat connection failed (code ${res.code})`)
        this.userId = t.userId
        this.setState('connected')
      } catch (e) {
        this.setState('error')
        throw e
      } finally {
        this.connecting = null
      }
    })()
    return this.connecting
  }

  async disconnect(): Promise<void> {
    try { const { NCEngine } = await loadSdk(); await NCEngine.disconnect() } catch { /* already disconnected */ }
    this.userId = null
    this.setState('idle')
  }

  private channel(sdk: Sdk, ref: ChannelRef) {
    return ref.kind === 'group' ? new sdk.GroupChannel(ref.id) : new sdk.DirectChannel(ref.id)
  }

  private identifier(sdk: Sdk, ref: ChannelRef) {
    return ref.kind === 'group' ? new sdk.GroupChannelIdentifier(ref.id) : new sdk.DirectChannelIdentifier(ref.id)
  }

  normalize(sdk: Sdk, m: Message<any>): ChatMessage {
    const { MessageType, SentStatus } = sdk
    const c = m.content as Record<string, any>
    const type = m.messageType
    const base = {
      id: m.messageId || `local-${m.clientId}`,
      channelId: m.channelIdentifier.channelId,
      senderId: m.senderUserId,
      sentTime: m.sentTime,
      mine: m.senderUserId === this.userId,
      status:
        m.sentStatus === SentStatus.READ ? ('read' as const)
        : m.sentStatus === SentStatus.FAILED ? ('failed' as const)
        : m.sentStatus === SentStatus.SENDING ? ('sending' as const)
        : ('sent' as const),
    }
    if (type === MessageType.TEXT) return { ...base, kind: 'text', text: String(c.text ?? '') }
    if (type === MessageType.IMAGE) return { ...base, kind: 'image', url: c.remoteUrl, name: 'Image' }
    if (type === MessageType.FILE) return { ...base, kind: 'file', url: c.remoteUrl, name: c.name }
    return { ...base, kind: 'other', text: 'Unsupported message type' }
  }

  /** Loads message history (oldest first). Pass the oldest loaded sentTime to page backwards. */
  async history(ref: ChannelRef, before?: number, pageSize = 30): Promise<ChatMessage[]> {
    const sdk = await loadSdk()
    const query = sdk.BaseChannel.createMessagesQuery({
      channelIdentifier: this.identifier(sdk, ref),
      isAscending: false,
      pageSize,
      // Nexconn's history query pages backwards from startTime; the documented first call passes the current time.
      startTime: before ?? Date.now(),
    })
    const res = await query.loadNextPage()
    if (!res.isOk || !res.data) throw new Error(`Could not load history (code ${res.code})`)
    return res.data.data.map((m) => this.normalize(sdk, m)).sort((a, b) => a.sentTime - b.sentTime)
  }

  async sendText(ref: ChannelRef, text: string): Promise<ChatMessage> {
    const sdk = await loadSdk()
    const params = new sdk.SendTextMessageParams({ text })
    params.needReceipt = true
    const res = await this.channel(sdk, ref).sendMessage(params)
    if (!res.isOk || !res.data) throw new Error(`Message not sent (code ${res.code})`)
    return this.normalize(sdk, res.data)
  }

  async sendFile(ref: ChannelRef, file: File): Promise<ChatMessage> {
    if (file.size > 10 * 1024 * 1024) throw new Error('Files must be 10 MB or smaller')
    const sdk = await loadSdk()
    if (file.type.startsWith('image/')) {
      const thumb = await makeThumbnail(file)
      const params = new sdk.SendImageMessageParams({ remoteUrl: '', thumbnailBase64: thumb })
      params.file = file
      const res = await this.channel(sdk, ref).sendMediaMessage(params)
      if (!res.isOk || !res.data) throw new Error(`Image not sent (code ${res.code})`)
      return this.normalize(sdk, res.data)
    }
    const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin'
    const params = new sdk.SendFileMessageParams({ remoteUrl: '', name: file.name, size: file.size, fileType: ext })
    params.file = file
    const res = await this.channel(sdk, ref).sendMediaMessage(params)
    if (!res.isOk || !res.data) throw new Error(`File not sent (code ${res.code})`)
    return this.normalize(sdk, res.data)
  }

  /** Marks messages as read for the sender's read receipts (best effort). */
  async markRead(ref: ChannelRef, messageIds: string[]): Promise<void> {
    try {
      const ch = this.channel(await loadSdk(), ref)
      if (messageIds.length) await ch.sendReadReceiptResponse(messageIds)
      await ch.clearUnreadCount()
    } catch { /* receipts are optional */ }
  }
}

export const chat = new ChatManager()

/** JPEG thumbnail (no data-URL prefix, under 80 KB) as required by the SDK image message. */
export async function makeThumbnail(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 240 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bmp.width * scale))
  canvas.height = Math.max(1, Math.round(bmp.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Image processing is not available in this browser')
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}
