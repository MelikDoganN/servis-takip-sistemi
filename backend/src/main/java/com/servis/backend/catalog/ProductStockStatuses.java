package com.servis.backend.catalog;

/**
 * Public katalog stok durumu sabitleri.
 */
public final class ProductStockStatuses {
    public static final String AVAILABLE = "AVAILABLE";
    public static final String LIMITED = "LIMITED";
    public static final String OUT_OF_STOCK = "OUT_OF_STOCK";
    public static final String MADE_TO_ORDER = "MADE_TO_ORDER";
    public static final String CONTACT = "CONTACT";

    private ProductStockStatuses() {
    }

    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return AVAILABLE;
        }
        String v = raw.trim().toUpperCase();
        return switch (v) {
            case AVAILABLE, LIMITED, OUT_OF_STOCK, MADE_TO_ORDER, CONTACT -> v;
            default -> AVAILABLE;
        };
    }
}
