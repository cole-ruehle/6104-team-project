<template>
  <div class="tutorials-page">
    <div class="page-header">
      <h1 class="page-title">Tutorials</h1>
      <p class="page-subtitle">
        Learn how to get the most out of your professional network management
        platform.
      </p>
    </div>

    <div class="tutorials-container">
      <!-- Tutorial 1: Using Search -->
      <div class="tutorial-card">
        <div class="tutorial-icon">🔍</div>
        <h2 class="tutorial-title">Using Search</h2>
        <div class="tutorial-content">
          <p class="tutorial-intro">
            Find connections quickly using our powerful search functionality
            with smart suggestions and AI-powered semantic search.
          </p>
          <ol class="tutorial-steps">
            <li>
              <strong>Go to Home:</strong> Navigate to the Home page to access
              the search bar.
            </li>
            <li>
              <strong>Type your query:</strong> Start typing what you're looking
              for in the search bar. This could be:
              <ul class="nested-list">
                <li>A person's name - suggestions will appear as you type</li>
                <li>
                  A filter (like company, location, or platform) - filter
                  suggestions will pop up in the dropdown
                </li>
              </ul>
            </li>
            <li>
              <strong>Use suggestions:</strong> Click on any suggestion from the
              dropdown to quickly filter or search for that person or filter.
            </li>
            <li>
              <strong>Enable Smart Search:</strong> Click the "Smart Search"
              button to turn on embedding technology that finds the best
              semantic matches for whatever you type, even if it doesn't match
              exactly.
            </li>
          </ol>
          <div class="tutorial-tip">
            <i class="fa-solid fa-lightbulb"></i>
            <span
              >Smart Search uses AI embeddings to understand the meaning behind
              your query, making it perfect for finding connections based on
              concepts, skills, or descriptions rather than exact text
              matches.</span
            >
          </div>
        </div>
      </div>

      <!-- Tutorial 2: Import from LinkedIn -->
      <div class="tutorial-card">
        <div class="tutorial-icon">📥</div>
        <h2 class="tutorial-title">Import from LinkedIn</h2>
        <div class="tutorial-content">
          <p class="tutorial-intro">
            Import your existing LinkedIn connections to quickly build your
            network.
          </p>
          <ol class="tutorial-steps">
            <li>
              <strong>Request your LinkedIn data:</strong>
              <ul class="nested-list">
                <li>Go to your LinkedIn account settings</li>
                <li>Navigate to "Data Privacy" or "Get a copy of your data"</li>
                <li>
                  Request your data export and select "Connections" as the data
                  you want to export
                </li>
                <li>
                  LinkedIn will email you when your data is ready (usually
                  within 24 hours)
                </li>
              </ul>
            </li>
            <li>
              <strong>Download your connections file:</strong>
              Once you receive the email, download the ZIP file and extract it.
              Look for the "Connections.csv" file.
            </li>
            <li>
              <strong>Import to the platform:</strong>
              <ul class="nested-list">
                <li>
                  Open the Import modal (usually found in Edit Network or
                  Settings)
                </li>
                <li>
                  Click "Choose File" and select your Connections.csv file
                </li>
                <li>Click "Upload & Import" to start the import process</li>
              </ul>
            </li>
            <li>
              <strong>Wait for completion:</strong> The system will process your
              connections and add them to your network. You'll see a
              confirmation when the import is complete.
            </li>
          </ol>
          <div class="tutorial-tip">
            <i class="fa-solid fa-lightbulb"></i>
            <span
              >The import process automatically maps LinkedIn fields to your
              network, preserving names, companies, locations, and other
              professional information.</span
            >
          </div>
        </div>
      </div>

      <!-- Tutorial 3: Add Connections Manually -->
      <div class="tutorial-card">
        <div class="tutorial-icon">➕</div>
        <h2 class="tutorial-title">Add Connections Manually</h2>
        <div class="tutorial-content">
          <p class="tutorial-intro">
            Manually add connections to your network by filling out their
            information and specifying how you're connected.
          </p>
          <ol class="tutorial-steps">
            <li>
              <strong>Click "Add Connection":</strong> Find and click the "Add
              Connection" button (usually in Edit Network or on the Home page).
            </li>
            <li>
              <strong>Fill out the information:</strong> Complete the form with
              everything you know about the person:
              <ul class="nested-list">
                <li>First Name and Last Name (required)</li>
                <li>Location (optional)</li>
                <li>Company (optional)</li>
                <li>Job Title (optional)</li>
                <li>Headline (optional)</li>
              </ul>
            </li>
            <li>
              <strong>Specify connection type:</strong> Expand "Advanced
              Options" and select how you're connected:
              <ul class="nested-list">
                <li>
                  <strong>Direct Connection (1st Degree):</strong>
                  Select this if you know them directly and have a first-degree
                  connection.
                </li>
                <li>
                  <strong>Connected Through Someone Else:</strong>
                  Select this if you're connected via another person. You'll
                  need to search for and select the person who connects you.
                </li>
              </ul>
            </li>
            <li>
              <strong>Save the connection:</strong> Click "Add Connection" to
              save. The connection will be added to your network with the
              relationship type you specified.
            </li>
          </ol>
          <div class="tutorial-tip">
            <i class="fa-solid fa-lightbulb"></i>
            <span
              >Specifying the correct connection type helps build an accurate
              network graph, showing direct connections (1st degree) and
              connections through others (2nd degree).</span
            >
          </div>
        </div>
      </div>

      <!-- Tutorial 4: Demo Video -->
      <div class="tutorial-card">
        <div class="tutorial-icon">🎥</div>
        <h2 class="tutorial-title">Demo Video Tutorial</h2>
        <div class="tutorial-content">
          <p class="tutorial-intro">
            Watch our recorded demo video for a walkthrough of all the
            platform's features.
          </p>
          <div
            style="
              position: relative;
              padding-bottom: 56.25%;
              height: 0;
              overflow: hidden;
              max-width: 100%;
            "
          >
            <iframe
              src="https://drive.google.com/file/d/1bn-1ZAqeJxGFJwGIGoZ7uutLX2XmFQ6H/preview"
              width="100%"
              height="360"
              allow="autoplay"
              style="
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: none;
              "
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Tutorials page
</script>

<style scoped>
.tutorials-page {
  max-width: 100%;
  margin: 0 auto;
  padding: 1.5rem 2rem;
  width: 100%;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: var(--color-navy-900);
}

.page-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
}

.tutorials-container {
  display: grid;
  grid-template-columns: repeat(2, 2fr);
  gap: 1.5rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.tutorial-card {
  background: white;
  border-radius: 1rem;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(15, 23, 42, 0.08);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.tutorial-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.tutorial-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  text-align: center;
}

.tutorial-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  color: var(--color-navy-900);
  text-align: center;
}

.tutorial-content {
  color: #475569;
}

.tutorial-intro {
  font-size: 1rem;
  color: #64748b;
  margin: 0 0 1rem;
  line-height: 1.5;
  text-align: center;
}

.tutorial-steps {
  margin: 0 0 1rem;
  padding-left: 1.25rem;
  line-height: 1.6;
}

.tutorial-steps li {
  margin-bottom: 0.5rem;
  font-size: 0.9375rem;
  color: #1e293b;
}

.tutorial-steps li strong {
  color: var(--color-navy-900);
  font-weight: 600;
}

.nested-list {
  margin-top: 0.5rem;
  margin-left: 1.25rem;
  list-style-type: disc;
}

.nested-list li {
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
  color: #475569;
}

.tutorial-tip {
  background: #f8fafc;
  border-left: 4px solid var(--color-navy-600);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-top: 1rem;
}

.tutorial-tip i {
  color: #fbbf24;
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.tutorial-tip span {
  font-size: 0.9375rem;
  color: #475569;
  line-height: 1.6;
}

.coming-soon-card {
  opacity: 0.9;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 2px dashed rgba(15, 23, 42, 0.15);
}

.coming-soon-notice {
  background: #fff7ed;
  border-left: 4px solid #f59e0b;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-top: 0.75rem;
}

.coming-soon-notice i {
  color: #f59e0b;
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.coming-soon-notice p {
  margin: 0;
  font-size: 1rem;
  color: #78350f;
  line-height: 1.6;
}

.coming-soon-notice p strong {
  color: #92400e;
  font-weight: 600;
}

@media (max-width: 768px) {
  .tutorials-page {
    padding: 1rem;
  }

  .tutorials-container {
    grid-template-columns: 1fr;
  }

  .tutorial-card {
    padding: 1.5rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .tutorial-title {
    font-size: 1.5rem;
  }
}
</style>
