package com.billing.filters;

import com.billing.data.AppUser;
import com.billing.domain.User;
import com.billing.service.AuthService;
import com.billing.utils.AccessTokenUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(2)
public class BasicAuthenticationFilter implements Filter {

    private final AuthService authService;
    private final AccessTokenUtils accessTokenUtils;

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;

        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader == null || authHeader.isBlank()) {
                chain.doFilter(req, res);
                return;
            }

            Claims claims;
            try {
                claims = accessTokenUtils.parseClaims(authHeader);
            } catch (ExpiredJwtException e) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token expired");
                return;
            } catch (JwtException e) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid token");
                return;
            }

            Object rawUserId = claims.get(AccessTokenUtils.USER_ID);
            Long userId = rawUserId instanceof Number ? ((Number) rawUserId).longValue() : null;
            if (userId == null) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Token expired or invalid");
                return;
            }

            Optional<User> user = authService.fetchById(userId);
            if (user.isEmpty()) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "User not found");
                return;
            }

            if (accessTokenUtils.shouldRefresh(claims)) {
                String newToken = accessTokenUtils.generateAccessToken(userId);
                response.setHeader("Authorization", "Bearer " + newToken);
            }

            AppUser appUser = new AppUser();
            appUser.setUser(user.get());
            appUser.setId(userId);
            AppContext.set(appUser);

            chain.doFilter(req, res);
        } finally {
            AppContext.destroy();
        }
    }
}
