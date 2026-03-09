const MICROSOFT_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";

let currentTenantId: string | undefined;

/**
 * Decode a JWT access token and extract the tenant ID (`tid` claim).
 * Only reads the payload — no signature verification needed.
 */
export function getTenantIdFromToken(token: string): string | undefined {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return undefined;
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return typeof payload.tid === "string" ? payload.tid : undefined;
  } catch {
    return undefined;
  }
}

export function setTenantId(tenantId: string | undefined): void {
  currentTenantId = tenantId;
}

export function getTenantId(): string | undefined {
  return currentTenantId;
}

export function isMicrosoftTenant(): boolean {
  return currentTenantId === MICROSOFT_TENANT_ID;
}

/**
 * Append a VPN reminder to an error message if the user is on the Microsoft tenant.
 */
export function withVpnHint(errorMsg: string): string {
  if (isMicrosoftTenant()) {
    return `${errorMsg} (Microsoft users: please ensure you are connected to VPN)`;
  }
  return errorMsg;
}
