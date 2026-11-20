package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ImageSanitizerTest {
    static { System.setProperty("java.awt.headless", "true"); }

    private static byte[] encode(int w, int h, String fmt) throws Exception {
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        for (int x = 0; x < w; x++) for (int y = 0; y < h; y++) img.setRGB(x, y, (x * 7 + y * 13) & 0xFFFFFF);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, fmt, out);
        return out.toByteArray();
    }

    @Test
    void acceptsJpegAndPngAndAlwaysReturnsCleanJpeg() throws Exception {
        for (String fmt : new String[]{"jpg", "png"}) {
            var clean = ImageSanitizer.sanitize(encode(64, 48, fmt));
            assertEquals("jpg", clean.extension());
            assertEquals("image/jpeg", clean.mime());
            assertEquals(64, clean.width());
            assertEquals((byte) 0xFF, clean.bytes()[0]);
            assertEquals((byte) 0xD8, clean.bytes()[1]);
        }
    }

    @Test
    void appendedPayloadAndMetadataAreRemoved() throws Exception {
        byte[] jpeg = encode(32, 32, "jpg");
        byte[] payload = "<script>alert(1)</script>EXIF-GPS-Latitude".getBytes(StandardCharsets.UTF_8);
        byte[] polyglot = new byte[jpeg.length + payload.length];
        System.arraycopy(jpeg, 0, polyglot, 0, jpeg.length);
        System.arraycopy(payload, 0, polyglot, jpeg.length, payload.length);
        var clean = ImageSanitizer.sanitize(polyglot);
        String text = new String(clean.bytes(), StandardCharsets.ISO_8859_1);
        assertFalse(text.contains("<script>"));
        assertFalse(text.contains("EXIF-GPS"));
    }

    @Test
    void largeImagesAreScaledDown() throws Exception {
        BufferedImage big = new BufferedImage(3000, 1500, BufferedImage.TYPE_INT_RGB); // smooth, so the PNG stays small
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        ImageIO.write(big, "png", bo);
        var clean = ImageSanitizer.sanitize(bo.toByteArray());
        assertEquals(ImageSanitizer.OUTPUT_MAX_SIDE, clean.width());
        assertEquals(1000, clean.height());
    }

    @Test
    void rejectsNonImagesEmptyAndTruncatedFiles() throws Exception {
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize(null));
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize(new byte[0]));
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize("MZ\u0090\u0000 malicious executable".getBytes(StandardCharsets.ISO_8859_1)));
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize("<svg xmlns='http://www.w3.org/2000/svg'><script>1</script></svg>".getBytes(StandardCharsets.UTF_8)));
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize("GIF89a....".getBytes(StandardCharsets.ISO_8859_1)));
        byte[] png = encode(40, 40, "png");
        byte[] truncated = java.util.Arrays.copyOf(png, 40);
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize(truncated));
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize(new byte[(int) ImageSanitizer.MAX_BYTES + 1]));
    }

    @Test
    void decompressionBombIsRejectedFromTheHeaderAlone() throws Exception {
        byte[] png = encode(20, 20, "png");
        // Patch the IHDR width/height to 100000 x 100000 without supplying pixel data (a classic bomb header).
        byte[] bomb = png.clone();
        int w = 100_000;
        for (int i = 0; i < 4; i++) { bomb[16 + i] = (byte) (w >> (24 - 8 * i)); bomb[20 + i] = (byte) (w >> (24 - 8 * i)); }
        assertThrows(ImageSanitizer.RejectedImageException.class, () -> ImageSanitizer.sanitize(bomb));
    }
}
