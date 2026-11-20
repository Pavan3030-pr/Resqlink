package com.resqlink.service;

/** Published after a new incident has been committed; triggers asynchronous AI analysis. */
public record IncidentCreatedEvent(long incidentId) {}
