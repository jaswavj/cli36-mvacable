package com.billing.utils;

import com.billing.properties.AccessTokenProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
@RequiredArgsConstructor
@Slf4j
public class AccessTokenUtils {

    public static final String USER_ID = "user_id";

    private final AccessTokenProperties properties;
    private static final long TOKEN_VALIDITY_MS = 8 * 60 * 60 * 1000;
    private static final long REFRESH_WINDOW_MS = 5 * 60 * 1000;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(properties.getPassword().getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(Long userId) {
        try {
            Date now = new Date();
            Date expiryDate = new Date(now.getTime() + TOKEN_VALIDITY_MS);
            return Jwts.builder()
                    .claim(USER_ID, userId)
                    .setIssuedAt(now)
                    .setExpiration(expiryDate)
                    .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                    .compact();
        } catch (Exception e) {
            log.error("Failed to generate access token", e);
            return null;
        }
    }

    public Claims parseClaims(String authorizationHeader) {
        String token = removeBearerPrefix(authorizationHeader);
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private String removeBearerPrefix(String token) {
        if (token == null) {
            return null;
        }
        return token.startsWith("Bearer ") ? token.substring(7).trim() : token.trim();
    }

    public boolean shouldRefresh(Claims claims) {
        long timeLeft = claims.getExpiration().getTime() - System.currentTimeMillis();
        return timeLeft <= REFRESH_WINDOW_MS;
    }
}
