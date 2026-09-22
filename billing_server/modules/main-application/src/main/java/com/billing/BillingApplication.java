package com.billing;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@OpenAPIDefinition(servers = {@Server(url = "/", description = "Default Server URL")})
@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
@ComponentScan(basePackages = "com.billing")
@ConfigurationPropertiesScan(basePackages = "com.billing")
@EntityScan(basePackages = "com.billing")
@EnableJpaRepositories(basePackages = "com.billing")
public class BillingApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        if (System.getProperty("spring.config.additional-location") == null) {
            System.setProperty(
                    "spring.config.additional-location",
                    "optional:file:./modules/main-application/src/main/resources/," +
                            "optional:file:./src/main/resources/"
            );
        }
        if (System.getProperty("spring.profiles.active") == null
                && (System.getenv("SPRING_PROFILES_ACTIVE") == null
                || System.getenv("SPRING_PROFILES_ACTIVE").isBlank())) {
            System.setProperty("spring.profiles.active", "dev");
        }
        SpringApplication.run(BillingApplication.class, args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(BillingApplication.class);
    }
}
