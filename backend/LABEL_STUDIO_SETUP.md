# Label Studio Setup & NLU Training Guide

## 1. Access Label Studio
The Label Studio login page should now be accessible.
- **URL:** `http://localhost:8080` (or your forwarded port)
- **Action:** Create an account (Sign up) if you haven't already.

## 2. Get API Key
We need to connect the backend to Label Studio to enable the "Data Flywheel".
1.  Log in to Label Studio.
2.  Click on the **User Icon** (top right) -> **Account & Settings**.
3.  Click **Account**.
4.  Copy the **Access Token**.

## 3. Configure Backend
Once you have the Access Token:
1.  Open `backend/docker-compose.unified.yml`.
2.  Find the `mangwale-ai` service.
3.  Add the environment variable:
    ```yaml
    - LABEL_STUDIO_API_KEY=your_copied_token_here
    ```
4.  Restart the backend:
    ```bash
    docker compose -f backend/docker-compose.unified.yml up -d mangwale-ai
    ```

## 4. Create Project
1.  In Label Studio, click **Create Project**.
2.  **Project Name:** `Mangwale NLU`
3.  **Description:** `Intent classification and entity extraction training data`
4.  **Labeling Setup:**
    -   Select **Natural Language Processing** -> **Text Classification**.
    -   (We will configure the specific labels later, or let the system auto-create them).

## 5. Start Training Pipeline
Once connected, the system will automatically push "Low Confidence" queries to this project.
-   **You:** Review and click "Submit" in Label Studio.
-   **System:** Will pick up approved samples for the next training run.
