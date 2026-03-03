import {
  Client as KustoClient,
  KustoConnectionStringBuilder,
} from "azure-kusto-data";
// import * as vscode from "vscode";

export interface TokenResponse {
  verificationUrl: string;
  userCode: string;
}

// Resource string to kusto client. The azure-kusto-data package
// does not have typescript support.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clients: Map<string, any> = new Map();

export async function newGetClient(
  clusterUri: string,
  accessToken?: string,
): Promise<KustoClient> {
  if (clients.has(clusterUri)) {
    return clients.get(clusterUri)!;
  } else {
    if (!accessToken) {
      throw new Error("Access token is required");
    }

    const kcsb = KustoConnectionStringBuilder.withAccessToken(
      clusterUri,
      accessToken,
    );
    const client = new KustoClient(kcsb);
    clients.set(clusterUri, client);
    return client;
  }
}

export async function getClient(
  clusterUri: string,
  tenantId: string | undefined,
  authCallback: (tokenResponse: TokenResponse) => void,
) {
  if (clients.has(clusterUri)) {
    return clients.get(clusterUri);
  } else {
<<<<<<< Updated upstream
=======
    // const scopes = [
    //   "https://management.core.windows.net/.default",
    //   "offline_access",
    // ];
    // const accounts = await vscode.authentication.getAccounts("microsoft");
    // const session = await vscode.authentication.getSession(
    //   "microsoft",
    //   scopes,
    //   {
    //     account: accounts[0],
    //     createIfNone: true,
    //     clearSessionPreference: true,
    //   },
    // );
>>>>>>> Stashed changes
    // If tenant id is empty in the input, consider it undefined when building the connection string
    if (!tenantId) {
      tenantId = undefined;
    }

    const kcsb = KustoConnectionStringBuilder.withAadDeviceAuthentication(
      clusterUri,
      tenantId,
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
}

export function getFirstOrDefaultClient(): {
  clusterUri: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kustoClient: any;
} {
  if (clients.size > 0) {
    const key = clients.keys().next().value;
    return {
      clusterUri: key,
      kustoClient: clients.get(clients.keys().next().value),
    };
  }
  return {
    clusterUri: "none",
    kustoClient: null,
  };
}
