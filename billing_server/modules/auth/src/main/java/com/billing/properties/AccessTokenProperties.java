package com.billing.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
@Getter
@Setter
public class AccessTokenProperties {

    @Value("${jwt.key.password}")
    private String password;
}
