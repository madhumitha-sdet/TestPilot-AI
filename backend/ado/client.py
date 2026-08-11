import base64

import requests


class AzureDevOpsClient:
    """Client for authenticating and connecting to an Azure DevOps organization/project."""

    def __init__(self, organization_url: str, personal_access_token: str) -> None:
        """
        Initialize the client with the Azure DevOps org/project URL and PAT.

        Args:
            organization_url: Base URL of the Azure DevOps organization/project,
                e.g. "https://dev.azure.com/myorg/myproject".
            personal_access_token: Personal Access Token used for authentication.
        """
        self.organization_url = organization_url.rstrip("/")
        self.personal_access_token = personal_access_token
        self._session = requests.Session()
        self._session.headers.update(self._build_auth_header())

    def _build_auth_header(self) -> dict[str, str]:
        """
        Build the Basic Authentication header required by Azure DevOps REST API.

        Azure DevOps expects the PAT to be sent as the password with an empty
        username, base64-encoded.

        Returns:
            A dictionary containing the Authorization header.
        """
        token = base64.b64encode(f":{self.personal_access_token}".encode()).decode()
        return {"Authorization": f"Basic {token}"}

    def connect(self) -> bool:
        """
        Verify credentials and project access via a lightweight authenticated request.

        Returns:
            True if the connection and authentication succeed.

        Raises:
            ConnectionError: If the request fails due to network issues.
            PermissionError: If authentication fails (invalid PAT or no access).
            RuntimeError: For any other unexpected API error response.
        """
        url = f"{self.organization_url}/_apis/projects?api-version=7.1-preview.4"

        try:
            response = self._session.get(url, timeout=10)
        except requests.exceptions.RequestException as exc:
            raise ConnectionError(f"Failed to connect to Azure DevOps: {exc}") from exc

        if response.status_code == 200:
            return True
        elif response.status_code in (401, 403):
            raise PermissionError(
                f"Authentication failed (status {response.status_code}). "
                "Check the organization URL and Personal Access Token."
            )
        else:
            raise RuntimeError(
                f"Unexpected error connecting to Azure DevOps "
                f"(status {response.status_code}): {response.text}"
            )