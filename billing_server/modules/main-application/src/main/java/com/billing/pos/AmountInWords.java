package com.billing.pos;

public final class AmountInWords {

    private static final String[] UNITS = {
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    };
    private static final String[] TENS = {
            "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    };

    private AmountInWords() {
    }

    public static String from(double amount) {
        long rupees = (long) amount;
        int paise = (int) Math.round((amount - rupees) * 100);
        String words = convert(rupees) + " Rupees";
        if (paise > 0) {
            words += " and " + convert(paise) + " Paise";
        }
        return words + " Only";
    }

    private static String convert(long n) {
        if (n < 20) {
            return UNITS[(int) n];
        }
        if (n < 100) {
            return TENS[(int) n / 10] + ((n % 10 != 0) ? " " + UNITS[(int) (n % 10)] : "");
        }
        if (n < 1000) {
            return UNITS[(int) (n / 100)] + " Hundred" + ((n % 100 != 0) ? " " + convert(n % 100) : "");
        }
        if (n < 100000) {
            return convert(n / 1000) + " Thousand" + ((n % 1000 != 0) ? " " + convert(n % 1000) : "");
        }
        if (n < 10000000) {
            return convert(n / 100000) + " Lakh" + ((n % 100000 != 0) ? " " + convert(n % 100000) : "");
        }
        return convert(n / 10000000) + " Crore" + ((n % 10000000 != 0) ? " " + convert(n % 10000000) : "");
    }
}
