import {
  Client as KustoClient,
  KustoConnectionStringBuilder,
} from "azure-kusto-data";

export interface TokenResponse {
  verificationUrl: string;
  userCode: string;
}

const clients: Map<string, KustoClient> = new Map();

export function getClient(
  clusterUri: string,
  tenantId: string | undefined,
  authCallback: (tokenResponse: TokenResponse) => void,
): KustoClient {
  if (clients.has(clusterUri)) {
    return clients.get(clusterUri)!; // safe: checked .has() above
  }
  // If tenant id is empty in the input, consider it undefined when building the connection string
  let actualTenantId = tenantId;
  if (!actualTenantId) {
    actualTenantId = undefined;
  }

  const kcsb = KustoConnectionStringBuilder.withAadDeviceAuthentication(
    clusterUri,
    actualTenantId,
    (deviceCodeInfo) => {
      authCallback({
        verificationUrl: deviceCodeInfo.verificationUri,
        userCode: deviceCodeInfo.userCode,
      });
    },
  );
  const kustoClient = new KustoClient(kcsb);
  clients.set(clusterUri, kustoClient);
  return kustoClient;
}

export function getFirstOrDefaultClient(): {
  clusterUri: string;
  kustoClient: KustoClient | null;
} {
  if (clients.size > 0) {
    const key = clients.keys().next().value as string;
    return {
      clusterUri: key,
      kustoClient: clients.get(key) ?? null,
    };
  }
  return {
    clusterUri: "none",
    kustoClient: null,
  };
}
