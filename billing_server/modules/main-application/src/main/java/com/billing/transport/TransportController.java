package com.billing.transport;

import com.billing.core.response.ResponseDO;
import com.billing.security.PlatformSecurityContext;
import com.billing.transport.dto.CollectTransportRequest;
import com.billing.transport.dto.SaveTransportBillRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/transport")
public class TransportController {

    private final TransportService transportService;
    private final TransportImageStore imageStore;
    private final PlatformSecurityContext securityContext;

    @GetMapping("/customers")
    public ResponseDO customers(@RequestParam(required = false) String query,
                                @RequestParam(required = false) String phone) {
        return ok(transportService.searchTransports(query, phone));
    }

    @GetMapping("/bills")
    public ResponseDO bills() {
        return ok(transportService.bills());
    }

    @GetMapping("/pending-allotments")
    public ResponseDO pendingAllotments() {
        return ok(transportService.pendingAllotments());
    }

    @GetMapping("/pending-payments")
    public ResponseDO pendingPayments() {
        return ok(transportService.pendingPayments());
    }

    @GetMapping("/pending-vehicle-payments")
    public ResponseDO pendingVehiclePayments() {
        return ok(transportService.pendingVehiclePayments());
    }

    @GetMapping("/dashboard")
    public ResponseDO dashboard(@RequestParam(required = false) Integer year,
                                @RequestParam(required = false) Integer month) {
        return ok(transportService.dashboard(year, month));
    }

    @GetMapping("/allotted")
    public ResponseDO allotted() {
        return ok(transportService.allottedBills());
    }

    @GetMapping("/{id}/payments")
    public ResponseDO payments(@PathVariable Long id, @RequestParam(defaultValue = "agent") String kind) {
        return ok(transportService.paymentHistory(id, kind));
    }

    @PostMapping("/save")
    public ResponseDO save(@RequestBody SaveTransportBillRequest request) {
        return ok(transportService.save(request, currentUserId()));
    }

    @PostMapping("/{id}/allot")
    public ResponseDO allot(@PathVariable Long id, @RequestBody(required = false) CollectTransportRequest request) {
        return ok(transportService.allot(id, request == null ? new CollectTransportRequest() : request, currentUserId()));
    }

    @PostMapping("/{id}/collect")
    public ResponseDO collect(@PathVariable Long id, @RequestBody CollectTransportRequest request) {
        return ok(transportService.collect(id, request, currentUserId()));
    }

    @PostMapping("/{id}/pay-vehicle")
    public ResponseDO payVehicle(@PathVariable Long id, @RequestBody CollectTransportRequest request) {
        return ok(transportService.payVehicle(id, request, currentUserId()));
    }

    @PostMapping("/{id}/unload")
    public ResponseDO unload(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        boolean unloaded = body != null && Boolean.TRUE.equals(body.get("unloaded"));
        return ok(transportService.markUnloaded(id, unloaded, currentUserId()));
    }

    @PostMapping(value = "/{id}/bill-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseDO uploadBill(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String name = imageStore.save(id, transportService.requireBill(id).getTrNo(), file);
        return ok(transportService.attachBillImage(id, name));
    }

    @GetMapping("/images/{id}/{filename:.+}")
    public ResponseEntity<Resource> image(@PathVariable Long id, @PathVariable String filename) throws Exception {
        Path file = imageStore.resolve(id, filename);
        String contentType = Files.probeContentType(file);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                .contentType(MediaType.parseMediaType(contentType == null ? "application/octet-stream" : contentType))
                .body(new FileSystemResource(file));
    }

    private Long currentUserId() {
        return securityContext.authenticateUser().getId();
    }

    private ResponseDO ok(Object data) {
        ResponseDO response = new ResponseDO();
        response.setSuccess(true);
        response.setData(data);
        return response;
    }
}
