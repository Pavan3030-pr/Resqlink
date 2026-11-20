package com.resqlink.core;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class DtoValidationHintTest {
    @Test
    void categoryParsingAcceptsFormLabels() {
        assertEquals(Category.MEDICAL, Category.parse("Medical Emergency"));
        assertEquals(Category.ACCIDENT, Category.parse("road accident"));
        assertEquals(Priority.CRITICAL, Priority.parse("critical"));
        assertThrows(IllegalArgumentException.class, () -> Category.parse("earthquake"));
        assertThrows(IllegalArgumentException.class, () -> Priority.parse(null));
    }
}
