package com.billing.transport;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Component
public class TransportImageStore {

    private static final Set<String> ALLOWED = Set.of("jpg", "jpeg", "png", "webp", "pdf");

    private final Path root;

    public TransportImageStore(@Value("${transport.images-dir:vmtImages}") String configured) {
        this.root = Paths.get(configured).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.root);
        } catch (IOException e) {
            throw new RuntimeException("Could not create vmtImages folder: " + this.root);
        }
    }

    public String save(Long billId, String trNo, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Select a bill image to upload.");
        }
        String ext = extension(file.getOriginalFilename());
        if (!ALLOWED.contains(ext)) {
            throw new RuntimeException("Upload jpg, png, webp or pdf only.");
        }
        String safeTr = (trNo == null ? "TR" : trNo).replaceAll("[^A-Za-z0-9-]", "");
        String name = safeTr + "_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "." + ext;
        Path dir = root.resolve(String.valueOf(billId));
        try {
            Files.createDirectories(dir);
            Files.copy(file.getInputStream(), dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Could not save image.");
        }
        return name;
    }

    public Path resolve(Long billId, String filename) {
        String safe = filename == null ? "" : filename.replace("\\", "/");
        if (safe.contains("..") || safe.contains("/") || safe.isBlank()) {
            throw new RuntimeException("Invalid file name.");
        }
        Path file = root.resolve(String.valueOf(billId)).resolve(safe).normalize();
        if (!file.startsWith(root) || !Files.exists(file)) {
            throw new RuntimeException("Image not found.");
        }
        return file;
    }

    public Path root() {
        return root;
    }

    private String extension(String original) {
        if (original == null || !original.contains(".")) {
            return "";
        }
        return original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }
}
