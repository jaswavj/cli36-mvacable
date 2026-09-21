package com.billing.customer.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class PagedResult<T> {
    private List<T> rows = new ArrayList<>();
    private long total;
    private int page;
    private int size;

    public static int pageOf(Integer page) {
        return page == null || page < 1 ? 1 : page;
    }

    public static int sizeOf(Integer size) {
        if (size == null || size < 1) {
            return 25;
        }
        return Math.min(size, 100);
    }

    public static <T> PagedResult<T> of(List<T> all, Integer page, Integer size) {
        int p = pageOf(page);
        int s = sizeOf(size);
        int from = Math.min((p - 1) * s, all.size());
        int to = Math.min(from + s, all.size());
        PagedResult<T> result = new PagedResult<>();
        result.setRows(all.subList(from, to));
        result.setTotal(all.size());
        result.setPage(p);
        result.setSize(s);
        return result;
    }
}
