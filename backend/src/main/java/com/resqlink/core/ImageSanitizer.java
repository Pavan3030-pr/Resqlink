package com.resqlink.core;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;

/**
 * Validates and re-encodes uploaded evidence. Decoding then re-encoding removes EXIF/GPS metadata, appended payloads
 * and polyglot tricks; dimension limits stop decompression bombs. Only JPEG and PNG are accepted.
 */
public final class ImageSanitizer {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    public static final long MAX_PIXELS = 25_000_000L;
    public static final int MAX_SIDE = 12_000;
    public static final int OUTPUT_MAX_SIDE = 2_000;

    private ImageSanitizer() {}

    public record Clean(byte[] bytes, String extension, String mime, int width, int height) {}

    public static class RejectedImageException extends RuntimeException {
        public RejectedImageException(String message) { super(message); }
    }

    public static Clean sanitize(byte[] input) {
        if (input == null || input.length == 0) throw new RejectedImageException("The image file is empty");
        if (input.length > MAX_BYTES) throw new RejectedImageException("Image is too large (max 5 MB)");
        String format = sniff(input);
        if (format == null) throw new RejectedImageException("Only JPEG or PNG images are accepted");
        BufferedImage img;
        try (ImageInputStream in = new MemoryCacheImageInputStream(new ByteArrayInputStream(input))) {
            Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(format);
            if (!readers.hasNext()) throw new RejectedImageException("Unsupported image format");
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                int w = reader.getWidth(0), h = reader.getHeight(0); // header only: checked before decoding pixels
                if (w <= 0 || h <= 0 || w > MAX_SIDE || h > MAX_SIDE || (long) w * h > MAX_PIXELS) {
                    throw new RejectedImageException("Image dimensions are too large");
                }
                img = reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (RejectedImageException e) {
            throw e;
        } catch (IOException | RuntimeException e) {
            throw new RejectedImageException("The file is not a valid image");
        }
        if (img == null) throw new RejectedImageException("The file is not a valid image");

        int w = img.getWidth(), h = img.getHeight();
        double scale = Math.min(1.0, (double) OUTPUT_MAX_SIDE / Math.max(w, h));
        int nw = Math.max(1, (int) Math.round(w * scale)), nh = Math.max(1, (int) Math.round(h * scale));
        BufferedImage rgb = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, nw, nh);
            g.drawImage(img, 0, 0, nw, nh, null);
        } finally {
            g.dispose();
        }
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (var ios = ImageIO.createImageOutputStream(out)) {
                writer.setOutput(ios);
                ImageWriteParam p = writer.getDefaultWriteParam();
                p.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                p.setCompressionQuality(0.85f);
                writer.write(null, new IIOImage(rgb, null, null), p); // null metadata: nothing is carried over
            } finally {
                writer.dispose();
            }
            return new Clean(out.toByteArray(), "jpg", "image/jpeg", nw, nh);
        } catch (IOException e) {
            throw new RejectedImageException("The image could not be processed");
        }
    }

    static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpeg";
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        return null;
    }
}
