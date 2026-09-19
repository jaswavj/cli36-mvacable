package com.billing.controllers;

import com.billing.core.response.ResponseDO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ResponseDO> handleRuntime(RuntimeException ex) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(false);
        response.setData(Map.of("error", ex.getMessage() != null ? ex.getMessage() : "Request failed"));
        HttpStatus status = "Invalid Credentials".equals(ex.getMessage())
                ? HttpStatus.UNAUTHORIZED
                : HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(response);
    }
}
