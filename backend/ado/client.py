import base64
from urllib.parse import quote

import requests

from backend.models.test_case import TestCase


class AzureDevOpsClient:
    """Client for authenticating and interacting with an Azure DevOps organization/project."""

    def __init__(
        self,
        organization_url: str,
        project_name: str,
        personal_access_token: str,
    ) -> None:
        """
        Initialize the client with separate organization and project configuration.

        Args:
            organization_url: Base URL of the Azure DevOps organization,
                e.g. "https://dev.azure.com/myorganization".
            project_name: Name of the Azure DevOps project within the organization.
            personal_access_token: Personal Access Token used for authentication.
        """
        self.organization_url = organization_url.rstrip("/")
        self.project_name = project_name
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

    def _project_api_url(self, path: str) -> str:
        """
        Build a project-scoped Azure DevOps API URL.

        Args:
            path: API path segment appended after the project, e.g.
                "_apis/wit/wiql?api-version=7.1-preview.2".

        Returns:
            The fully constructed, project-scoped URL.
        """
        encoded_project = quote(self.project_name, safe="")
        return f"{self.organization_url}/{encoded_project}/{path}"

    def connect(self) -> bool:
        """
        Verify credentials and access to the configured project via a
        lightweight authenticated request.

        Returns:
            True if the connection and authentication succeed.

        Raises:
            ConnectionError: If the request fails due to network issues.
            PermissionError: If authentication fails (invalid PAT or no access).
            RuntimeError: For any other unexpected API error response.
        """
        url = self._project_api_url("_apis/project?api-version=7.1-preview.4")

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
        elif response.status_code == 404:
            raise RuntimeError(
                f"Project '{self.project_name}' was not found in organization "
                f"'{self.organization_url}'."
            )
        else:
            raise RuntimeError(
                f"Unexpected error connecting to Azure DevOps "
                f"(status {response.status_code}): {response.text}"
            )

    def get_test_cases(self) -> list[TestCase]:
        """
        Retrieve all Test Case work items from the configured project and
        convert them into TestCase objects.

        Returns:
            A list of TestCase objects built from Azure DevOps work items.

        Raises:
            ConnectionError: If a request fails due to network issues.
            PermissionError: If authentication fails (invalid PAT or no access).
            RuntimeError: For any other unexpected API error response.
        """
        work_item_ids = self._query_test_case_ids()
        if not work_item_ids:
            return []

        work_items = self._fetch_work_items(work_item_ids)
        return [self._map_to_test_case(item) for item in work_items]

    def _query_test_case_ids(self) -> list[int]:
        """
        Run a WIQL query to find the IDs of Test Case work items within the
        configured project only.

        Returns:
            A list of work item IDs.

        Raises:
            ConnectionError: If the request fails due to network issues.
            PermissionError: If authentication fails.
            RuntimeError: For any other unexpected API error response.
        """
        url = self._project_api_url("_apis/wit/wiql?api-version=7.1-preview.2")
        wiql_query = {
            "query": (
                "SELECT [System.Id] FROM WorkItems "
                "WHERE [System.WorkItemType] = 'Test Case' "
                "AND [System.TeamProject] = @project "
                "ORDER BY [System.Id]"
            )
        }

        response = self._post(url, json_body=wiql_query)
        work_items = response.json().get("workItems", [])
        return [item["id"] for item in work_items]

    def _fetch_work_items(self, work_item_ids: list[int]) -> list[dict]:
        """
        Fetch full field details for a batch of work item IDs.

        Note:
            The work item batch endpoint is organization-level (not
            project-scoped), since IDs are already unique organization-wide
            and were sourced from a project-scoped WIQL query.

        Args:
            work_item_ids: List of work item IDs to retrieve.

        Returns:
            A list of raw work item dictionaries as returned by the API.

        Raises:
            ConnectionError: If the request fails due to network issues.
            PermissionError: If authentication fails.
            RuntimeError: For any other unexpected API error response.
        """
        ids_param = ",".join(str(item_id) for item_id in work_item_ids)
        fields_param = (
            "System.Id,System.Title,System.Description,"
            "Microsoft.VSTS.TCM.Steps,Microsoft.VSTS.TCM.TestData"
        )
        url = (
            f"{self.organization_url}/_apis/wit/workitems"
            f"?ids={ids_param}&fields={fields_param}&api-version=7.1"
        )

        response = self._get(url)
        return response.json().get("value", [])

    def _map_to_test_case(self, work_item: dict) -> TestCase:
        """
        Convert a raw Azure DevOps work item into a TestCase object.

        Note:
            `Microsoft.VSTS.TCM.Steps` contains raw XML-formatted test steps,
            not a plain expected result. It is intentionally not mapped here
            to avoid misrepresenting step data as an expected result.
            `expected_result` is left empty until proper steps parsing is
            implemented separately.

        Args:
            work_item: Raw work item dictionary from the Azure DevOps API.

        Returns:
            A populated TestCase instance. Missing fields default to an
            empty string.
        """
        fields = work_item.get("fields", {})
        return TestCase(
            test_case_id=str(work_item.get("id", "")),
            title=fields.get("System.Title", ""),
            description=fields.get("System.Description", ""),
            expected_result="",
            test_data=fields.get("Microsoft.VSTS.TCM.TestData", ""),
        )

    def _get(self, url: str) -> requests.Response:
        """Send an authenticated GET request and handle common HTTP errors."""
        try:
            response = self._session.get(url, timeout=10)
        except requests.exceptions.RequestException as exc:
            raise ConnectionError(f"Failed to reach Azure DevOps: {exc}") from exc
        return self._handle_response(response)

    def _post(self, url: str, json_body: dict) -> requests.Response:
        """Send an authenticated POST request and handle common HTTP errors."""
        try:
            response = self._session.post(url, json=json_body, timeout=10)
        except requests.exceptions.RequestException as exc:
            raise ConnectionError(f"Failed to reach Azure DevOps: {exc}") from exc
        return self._handle_response(response)

    def _handle_response(self, response: requests.Response) -> requests.Response:
        """
        Validate an HTTP response, raising clear exceptions on failure.

        Args:
            response: The HTTP response to validate.

        Returns:
            The same response, if successful.

        Raises:
            PermissionError: If authentication fails (401/403).
            RuntimeError: For any other non-success status code.
        """
        if response.status_code == 200:
            return response
        elif response.status_code in (401, 403):
            raise PermissionError(
                f"Authentication failed (status {response.status_code}). "
                "Check the organization URL and Personal Access Token."
            )
        else:
            raise RuntimeError(
                f"Unexpected error from Azure DevOps "
                f"(status {response.status_code}): {response.text}"
            )