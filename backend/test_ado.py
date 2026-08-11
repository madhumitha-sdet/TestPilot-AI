import os
import sys

from ado.client import AzureDevOpsClient


def main() -> None:
    """Test the Azure DevOps connection using environment variables."""
    project_url = os.environ.get("ADO_PROJECT_URL")
    pat = os.environ.get("ADO_PAT")

    if not project_url or not pat:
        print("Error: ADO_PROJECT_URL and ADO_PAT environment variables must be set.")
        sys.exit(1)

    client = AzureDevOpsClient(
        organization_url=project_url,
        personal_access_token=pat,
    )

    if client.connect():
        print("ADO connection successful")


if __name__ == "__main__":
    main()