package com.aicc.backend.common.api;

public final class ApiVersion {

    public static final String V1 = "/api/v1";

    // Base paths per domain — use these in @RequestMapping on every controller
    public static final String V1_AUTH     = V1 + "/auth";
    public static final String V1_EVENTS   = V1 + "/events";
    public static final String V1_SESSIONS = V1 + "/sessions";
    public static final String V1_PROJECTS = V1 + "/projects";
    public static final String V1_MEMORY   = V1 + "/memory";
    public static final String V1_SYNC     = V1 + "/sync";
    public static final String V1_FILES    = V1 + "/files";
    public static final String V1_CONTEXT  = V1 + "/context";

    private ApiVersion() {}
}
