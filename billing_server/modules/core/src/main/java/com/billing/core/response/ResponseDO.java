package com.billing.core.response;

import lombok.Data;

@Data
public class ResponseDO {

    private boolean success;

    private Object data;
}
