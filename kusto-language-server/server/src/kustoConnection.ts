const KustoClient = require('azure-kusto-data').Client;
const KustoConnectionStringBuilder = require('azure-kusto-data').KustoConnectionStringBuilder;

export interface TokenResponse {
	verificationUrl: string,
	userCode: string
}

// Resource string to kusto client. The azure-kusto-data package
// does not have typescript support.
let clients: Map<string, any> = new Map();

export function getClient(clusterUri: string, authCallback: (tokenResponse: TokenResponse) => void) {
	if (clients.has(clusterUri)) {
		return clients.get(clusterUri);
	} else {
		const kcsb = KustoConnectionStringBuilder.withAadDeviceAuthentication(clusterUri, "common", (tokenResponse: TokenResponse) => {
			authCallback(tokenResponse);
		});
		const kustoClient = new KustoClient(kcsb);
		clients.set(clusterUri, kustoClient);
		return kustoClient;
	}
}

export function getFirstOrDefaultClient() : { clusterUri: string, kustoClient: any } {
	if (clients.size > 0) {
		let key = clients.keys().next().value;
		return {
			clusterUri: key, 
			kustoClient: clients.get(clients.keys().next().value)
		};
	}
	return {
		clusterUri: "none",
		kustoClient: null
	}
}
