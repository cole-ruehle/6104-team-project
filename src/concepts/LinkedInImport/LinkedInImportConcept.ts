import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import "jsr:@std/dotenv/load";

// Collection prefix to ensure namespace separation
const PREFIX = "LinkedInImport" + ".";

// Generic types for the concept's external dependencies
type User = ID;

// Internal entity types, represented as IDs
type LinkedInAccount = ID;
type Connection = ID;
type ImportJob = ID;

/**
 * State: A set of LinkedInAccounts with OAuth tokens and account information.
 */
interface LinkedInAccountDoc {
  _id: LinkedInAccount;
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  linkedInUserId: string;
  linkedInEmail?: string;
  linkedInName?: string;
  createdAt: Date;
  lastImportedAt?: Date;
}

/**
 * State: A set of Connections, representing imported LinkedIn connections.
 */
interface ConnectionDoc {
  _id: Connection;
  account: LinkedInAccount;
  linkedInConnectionId: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  location?: string;
  industry?: string;
  currentPosition?: string;
  currentCompany?: string;
  profileUrl?: string;
  profilePictureUrl?: string;
  summary?: string;
  skills?: string[];
  education?: Array<{
    school?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
  }>;
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }>;
  importedAt: Date;
  rawData?: Record<string, unknown>; // Store raw LinkedIn API response
}

/**
 * State: A set of ImportJobs tracking import operations.
 */
interface ImportJobDoc {
  _id: ImportJob;
  account: LinkedInAccount;
  status: "pending" | "in_progress" | "completed" | "failed";
  connectionsImported: number;
  connectionsTotal?: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * @concept LinkedInImport
 * @purpose Enable users to connect their LinkedIn account and import their connections with associated profile information into the system.
 * @principle When a user connects their LinkedIn account via OAuth and initiates an import, the system retrieves their connections and stores the public profile information (name, headline, location, experience, education, skills) for each connection, making this data available for network exploration and semantic search.
 */
export default class LinkedInImportConcept {
  accounts: Collection<LinkedInAccountDoc>;
  connections: Collection<ConnectionDoc>;
  importJobs: Collection<ImportJobDoc>;

  constructor(private readonly db: Db) {
    this.accounts = this.db.collection(PREFIX + "accounts");
    this.connections = this.db.collection(PREFIX + "connections");
    this.importJobs = this.db.collection(PREFIX + "importJobs");
  }

  /**
   * Action: Connects a LinkedIn account via OAuth.
   * connectLinkedInAccount (user: User, accessToken: String, refreshToken: String?, expiresAt: Date?, linkedInUserId: String, linkedInEmail: String?, linkedInName: String?): (account: LinkedInAccount)
   *
   * **requires**:
   *   - No LinkedInAccount exists for the given user.
   *   - accessToken is not empty.
   *   - linkedInUserId is not empty.
   *
   * **effects**:
   *   - Creates a new LinkedInAccount for the user with the provided OAuth tokens and profile information.
   *   - Returns the account ID.
   */
  async connectLinkedInAccount({
    user,
    accessToken,
    refreshToken,
    expiresAt,
    linkedInUserId,
    linkedInEmail,
    linkedInName,
  }: {
    user: User;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    linkedInUserId: string;
    linkedInEmail?: string;
    linkedInName?: string;
  }): Promise<{ account: LinkedInAccount } | { error: string }> {
    if (!accessToken || accessToken.trim() === "") {
      return { error: "accessToken is required and cannot be empty" };
    }
    if (!linkedInUserId || linkedInUserId.trim() === "") {
      return { error: "linkedInUserId is required and cannot be empty" };
    }

    // Check if account already exists for this user
    const existingAccount = await this.accounts.findOne({ user });
    if (existingAccount) {
      return {
        error: `LinkedIn account already exists for user ${user}. Use updateLinkedInAccount to update tokens.`,
      };
    }

    const accountId = freshID() as LinkedInAccount;
    await this.accounts.insertOne({
      _id: accountId,
      user,
      accessToken,
      refreshToken,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      linkedInUserId,
      linkedInEmail,
      linkedInName,
      createdAt: new Date(),
    });

    return { account: accountId };
  }

  /**
   * Action: Updates OAuth tokens for an existing LinkedIn account.
   * updateLinkedInAccount (account: LinkedInAccount, accessToken: String, refreshToken: String?, expiresAt: Date?): Empty
   *
   * **requires**:
   *   - A LinkedInAccount with the given account ID exists.
   *   - accessToken is not empty.
   *
   * **effects**:
   *   - Updates the accessToken, refreshToken, and expiresAt fields for the account.
   */
  async updateLinkedInAccount({
    account,
    accessToken,
    refreshToken,
    expiresAt,
  }: {
    account: LinkedInAccount;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }): Promise<Empty | { error: string }> {
    if (!accessToken || accessToken.trim() === "") {
      return { error: "accessToken is required and cannot be empty" };
    }

    const existingAccount = await this.accounts.findOne({ _id: account });
    if (!existingAccount) {
      return { error: `LinkedIn account with ID ${account} not found.` };
    }

    await this.accounts.updateOne(
      { _id: account },
      {
        $set: {
          accessToken,
          ...(refreshToken !== undefined && { refreshToken }),
          ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
        },
      },
    );

    return {};
  }

  /**
   * Action: Disconnects a LinkedIn account.
   * disconnectLinkedInAccount (account: LinkedInAccount): Empty
   *
   * **requires**:
   *   - A LinkedInAccount with the given account ID exists.
   *
   * **effects**:
   *   - Removes the LinkedInAccount and all associated Connections and ImportJobs.
   */
  async disconnectLinkedInAccount({
    account,
  }: {
    account: LinkedInAccount;
  }): Promise<Empty | { error: string }> {
    const existingAccount = await this.accounts.findOne({ _id: account });
    if (!existingAccount) {
      return { error: `LinkedIn account with ID ${account} not found.` };
    }

    // Delete account, connections, and import jobs
    await Promise.all([
      this.accounts.deleteOne({ _id: account }),
      this.connections.deleteMany({ account }),
      this.importJobs.deleteMany({ account }),
    ]);

    return {};
  }

  /**
   * Action: Starts an import job to fetch connections from LinkedIn.
   * startImport (account: LinkedInAccount): (importJob: ImportJob)
   *
   * **requires**:
   *   - A LinkedInAccount with the given account ID exists.
   *   - The account's accessToken is valid (not expired).
   *
   * **effects**:
   *   - Creates a new ImportJob with status "pending".
   *   - Returns the importJob ID.
   */
  async startImport({
    account,
  }: {
    account: LinkedInAccount;
  }): Promise<{ importJob: ImportJob } | { error: string }> {
    const existingAccount = await this.accounts.findOne({ _id: account });
    if (!existingAccount) {
      return { error: `LinkedIn account with ID ${account} not found.` };
    }

    // Check if token is expired
    // MongoDB may return expiresAt as a string, so convert to Date if needed
    if (existingAccount.expiresAt) {
      const expiresAt = existingAccount.expiresAt instanceof Date
        ? existingAccount.expiresAt
        : new Date(existingAccount.expiresAt);
      const now = new Date();
      const timeUntilExpiry = expiresAt.getTime() - now.getTime();

      // Only consider expired if it's actually in the past (with 5 second buffer for clock skew)
      const bufferMs = 5 * 1000;

      console.log(
        `[LinkedInImport] Token expiration check: expiresAt=${expiresAt.toISOString()}, now=${now.toISOString()}, timeUntilExpiry=${timeUntilExpiry}ms (${Math.round(timeUntilExpiry / 1000)}s)`,
      );

      if (timeUntilExpiry < -bufferMs) {
        console.log(
          `[LinkedInImport] ⚠️ Token is expired (expired ${Math.round(-timeUntilExpiry / 1000)}s ago)`,
        );
        return {
          error:
            "LinkedIn access token has expired. Please refresh the token first.",
        };
      } else {
        console.log(
          `[LinkedInImport] ✅ Token is valid (expires in ${Math.round(timeUntilExpiry / 1000)}s)`,
        );
      }
    } else {
      console.log(
        `[LinkedInImport] ⚠️ No expiration date set for account, allowing import`,
      );
    }

    const importJobId = freshID() as ImportJob;
    await this.importJobs.insertOne({
      _id: importJobId,
      account,
      status: "pending",
      connectionsImported: 0,
      startedAt: new Date(),
    });

    return { importJob: importJobId };
  }

  /**
   * Action: Adds a connection to the database (typically called during import).
   * addConnection (account: LinkedInAccount, linkedInConnectionId: String, firstName: String?, lastName: String?, headline: String?, location: String?, industry: String?, currentPosition: String?, currentCompany: String?, profileUrl: String?, profilePictureUrl: String?, summary: String?, skills: String[]?, education: JSON?, experience: JSON?, rawData: JSON?): (connection: Connection)
   *
   * **requires**:
   *   - A LinkedInAccount with the given account ID exists.
   *   - linkedInConnectionId is not empty.
   *
   * **effects**:
   *   - Creates or updates a Connection with the provided information.
   *   - If a connection with the same account and linkedInConnectionId exists, updates it.
   *   - Returns the connection ID.
   */
  async addConnection({
    account,
    linkedInConnectionId,
    firstName,
    lastName,
    headline,
    location,
    industry,
    currentPosition,
    currentCompany,
    profileUrl,
    profilePictureUrl,
    summary,
    skills,
    education,
    experience,
    rawData,
  }: {
    account: LinkedInAccount;
    linkedInConnectionId: string;
    firstName?: string;
    lastName?: string;
    headline?: string;
    location?: string;
    industry?: string;
    currentPosition?: string;
    currentCompany?: string;
    profileUrl?: string;
    profilePictureUrl?: string;
    summary?: string;
    skills?: string[];
    education?: Array<{
      school?: string;
      degree?: string;
      fieldOfStudy?: string;
      startYear?: number;
      endYear?: number;
    }>;
    experience?: Array<{
      title?: string;
      company?: string;
      startDate?: string;
      endDate?: string;
      description?: string;
    }>;
    rawData?: Record<string, unknown>;
  }): Promise<{ connection: Connection } | { error: string }> {
    if (!linkedInConnectionId || linkedInConnectionId.trim() === "") {
      return { error: "linkedInConnectionId is required and cannot be empty" };
    }

    const existingAccount = await this.accounts.findOne({ _id: account });
    if (!existingAccount) {
      return { error: `LinkedIn account with ID ${account} not found.` };
    }

    // Check if connection already exists
    const existingConnection = await this.connections.findOne({
      account,
      linkedInConnectionId,
    });

    if (existingConnection) {
      // Update existing connection
      await this.connections.updateOne(
        { _id: existingConnection._id },
        {
          $set: {
            ...(firstName !== undefined && { firstName }),
            ...(lastName !== undefined && { lastName }),
            ...(headline !== undefined && { headline }),
            ...(location !== undefined && { location }),
            ...(industry !== undefined && { industry }),
            ...(currentPosition !== undefined && { currentPosition }),
            ...(currentCompany !== undefined && { currentCompany }),
            ...(profileUrl !== undefined && { profileUrl }),
            ...(profilePictureUrl !== undefined && { profilePictureUrl }),
            ...(summary !== undefined && { summary }),
            ...(skills !== undefined && { skills }),
            ...(education !== undefined && { education }),
            ...(experience !== undefined && { experience }),
            ...(rawData !== undefined && { rawData }),
            importedAt: new Date(),
          },
        },
      );
      return { connection: existingConnection._id };
    } else {
      // Create new connection
      const connectionId = freshID() as Connection;
      await this.connections.insertOne({
        _id: connectionId,
        account,
        linkedInConnectionId,
        firstName,
        lastName,
        headline,
        location,
        industry,
        currentPosition,
        currentCompany,
        profileUrl,
        profilePictureUrl,
        summary,
        skills: skills || [],
        education: education || [],
        experience: experience || [],
        importedAt: new Date(),
        rawData,
      });
      return { connection: connectionId };
    }
  }

  /**
   * Action: Updates the status of an import job.
   * updateImportJobStatus (importJob: ImportJob, status: String, connectionsImported: Number, connectionsTotal: Number?, errorMessage: String?): Empty
   *
   * **requires**:
   *   - An ImportJob with the given importJob ID exists.
   *   - status is one of: "pending", "in_progress", "completed", "failed".
   *
   * **effects**:
   *   - Updates the import job's status, progress, and optional error message.
   *   - Sets completedAt if status is "completed" or "failed".
   */
  async updateImportJobStatus({
    importJob,
    status,
    connectionsImported,
    connectionsTotal,
    errorMessage,
  }: {
    importJob: ImportJob;
    status: "pending" | "in_progress" | "completed" | "failed";
    connectionsImported: number;
    connectionsTotal?: number;
    errorMessage?: string;
  }): Promise<Empty | { error: string }> {
    const validStatuses = ["pending", "in_progress", "completed", "failed"];
    if (!validStatuses.includes(status)) {
      return {
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      };
    }

    const existingJob = await this.importJobs.findOne({ _id: importJob });
    if (!existingJob) {
      return { error: `Import job with ID ${importJob} not found.` };
    }

    const updateData: Partial<ImportJobDoc> = {
      status,
      connectionsImported,
      ...(connectionsTotal !== undefined && { connectionsTotal }),
      ...(errorMessage !== undefined && { errorMessage }),
    };

    if (status === "completed" || status === "failed") {
      updateData.completedAt = new Date();
    }

    await this.importJobs.updateOne({ _id: importJob }, { $set: updateData });

    // Update lastImportedAt on the account when import completes
    if (status === "completed") {
      await this.accounts.updateOne(
        { _id: existingJob.account },
        { $set: { lastImportedAt: new Date() } },
      );
    }

    return {};
  }

  /**
   * Query: Retrieves the LinkedIn account for a user.
   */
  async _getLinkedInAccount({
    user,
  }: {
    user: User;
  }): Promise<LinkedInAccountDoc[]> {
    return await this.accounts.find({ user }).toArray();
  }

  /**
   * Query: Retrieves all connections for a LinkedIn account.
   */
  async _getConnections({
    account,
  }: {
    account: LinkedInAccount;
  }): Promise<ConnectionDoc[]> {
    return await this.connections.find({ account }).toArray();
  }

  /**
   * Query: Retrieves a connection by LinkedIn connection ID.
   */
  async _getConnectionByLinkedInId({
    account,
    linkedInConnectionId,
  }: {
    account: LinkedInAccount;
    linkedInConnectionId: string;
  }): Promise<ConnectionDoc[]> {
    return await this.connections
      .find({ account, linkedInConnectionId })
      .toArray();
  }

  /**
   * Query: Retrieves a connection by internal connection ID.
   */
  async _getConnection({
    connection,
  }: {
    connection: Connection;
  }): Promise<ConnectionDoc[]> {
    return await this.connections.find({ _id: connection }).toArray();
  }

  /**
   * Query: Retrieves all import jobs for a LinkedIn account.
   */
  async _getImportJobs({
    account,
  }: {
    account: LinkedInAccount;
  }): Promise<ImportJobDoc[]> {
    return await this.importJobs.find({ account }).toArray();
  }

  /**
   * Query: Retrieves the most recent import job for a LinkedIn account.
   */
  async _getLatestImportJob({
    account,
  }: {
    account: LinkedInAccount;
  }): Promise<ImportJobDoc[]> {
    const jobs = await this.importJobs
      .find({ account })
      .sort({ startedAt: -1 })
      .limit(1)
      .toArray();
    return jobs;
  }

  /**
   * Query: Retrieves the user (owner) for a LinkedIn account.
   */
  async _getAccountUser({
    account,
  }: {
    account: LinkedInAccount;
  }): Promise<{ user: User }[]> {
    const accountDoc = await this.accounts.findOne({ _id: account });
    if (!accountDoc) {
      return [];
    }
    return [{ user: accountDoc.user }];
  }

  /**
   * Helper: Uses LLM to map JSON object keys to ConnectionDoc fields.
   * Returns a mapping object: { jsonKey: connectionFieldName }
   */
  private async mapJSONFieldsWithLLM(
    jsonKeys: string[],
  ): Promise<Record<string, string> | { error: string }> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return { error: "GEMINI_API_KEY environment variable not set" };
    }

    const fieldMappingPrompt = `You are a data mapping assistant. Given JSON object keys from a LinkedIn connections export, map them to the following ConnectionDoc fields:

Available fields:
- linkedInConnectionId (required): unique identifier for the connection
- firstName: first name
- lastName: last name
- headline: professional headline
- location: location string
- industry: industry name
- currentPosition: current job title
- currentCompany: current company name
- profileUrl: LinkedIn profile URL
- profilePictureUrl: profile picture URL
- summary: profile summary
- skills: array of skill strings
- education: array of education entries
- experience: array of experience entries

JSON Keys: ${jsonKeys.join(", ")}

Return ONLY a JSON object mapping JSON key names to ConnectionDoc field names. Use null for fields that don't match. Example:
{"first_name": "firstName", "last_name": "lastName", "headline": "headline", "unrelated_field": null}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fieldMappingPrompt }],
            }],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `LLM API error: ${errorText}` };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return { error: "No response from LLM" };
      }

      // Extract JSON from LLM response (may include markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: "Could not parse LLM response as JSON" };
      }

      const mapping = JSON.parse(jsonMatch[0]);
      return mapping;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { error: `LLM mapping failed: ${err.message}` };
    }
  }

  /**
   * Helper: Uses LLM to map CSV column headers to ConnectionDoc fields.
   * Returns a mapping object: { csvColumnName: connectionFieldName }
   */
  private async mapCSVFieldsWithLLM(
    csvHeaders: string[],
  ): Promise<Record<string, string> | { error: string }> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return { error: "GEMINI_API_KEY environment variable not set" };
    }

    const fieldMappingPrompt = `You are a data mapping assistant. Given CSV column headers from a LinkedIn connections export, map them to the following ConnectionDoc fields:

Available fields:
- linkedInConnectionId (required): unique identifier for the connection
- firstName: first name
- lastName: last name
- headline: professional headline
- location: location string
- industry: industry name
- currentPosition: current job title
- currentCompany: current company name
- profileUrl: LinkedIn profile URL
- profilePictureUrl: profile picture URL
- summary: profile summary
- skills: array of skill strings (comma-separated in CSV)
- education: array of education entries (may need parsing)
- experience: array of experience entries (may need parsing)

CSV Headers: ${csvHeaders.join(", ")}

Return ONLY a JSON object mapping CSV column names to ConnectionDoc field names. Use null for fields that don't match. Example:
{"First Name": "firstName", "Last Name": "lastName", "Headline": "headline", "Unrelated Column": null}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: fieldMappingPrompt }],
            }],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        return { error: `LLM API error: ${errorText}` };
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return { error: "No response from LLM" };
      }

      // Extract JSON from LLM response (may include markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { error: "Could not parse LLM response as JSON" };
      }

      const mapping = JSON.parse(jsonMatch[0]);
      return mapping;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return { error: `LLM mapping failed: ${err.message}` };
    }
  }

  /**
   * Helper: Parses CSV content into rows with headers.
   */
  private parseCSV(csvContent: string): { headers: string[]; rows: string[][] } | { error: string } {
    const lines = csvContent.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) {
      return { error: "CSV content is empty" };
    }

    // Parse headers
    const headers = this.parseCSVLine(lines[0]);
    if (headers.length === 0) {
      return { error: "CSV has no headers" };
    }

    // Parse rows
    const rows: string[][] = [];
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length > 0) {
        rows.push(row);
      }
    }

    return { headers, rows };
  }

  /**
   * Helper: Parses a single CSV line, handling quoted fields.
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim()); // Last field

    return result;
  }

  /**
   * Action: Imports connections from a CSV file using LLM to map fields.
   * importConnectionsFromCSV (account: LinkedInAccount, csvContent: String): (importJob: ImportJob, connectionsImported: Number)
   *
   * **requires**:
   *   - A LinkedInAccount with the given account ID exists.
   *   - csvContent is not empty.
   *   - GEMINI_API_KEY environment variable is set.
   *
   * **effects**:
   *   - Parses the CSV content.
   *   - Uses LLM to map CSV columns to ConnectionDoc fields.
   *   - Creates an ImportJob with status "in_progress".
   *   - Processes each CSV row and calls addConnection for each.
   *   - Updates ImportJob status to "completed" or "failed".
   *   - Returns the importJob ID and number of connections imported.
   */
  async importConnectionsFromCSV({
    account,
    csvContent,
  }: {
    account: LinkedInAccount;
    csvContent: string;
  }): Promise<
    | { importJob: ImportJob; connectionsImported: number }
    | { error: string }
  > {
    // Validate account exists
    const existingAccount = await this.accounts.findOne({ _id: account });
    if (!existingAccount) {
      return { error: `LinkedIn account with ID ${account} not found.` };
    }

    // Validate CSV content
    if (!csvContent || csvContent.trim() === "") {
      return { error: "CSV content is required and cannot be empty" };
    }

    // Create import job
    const importJobId = freshID() as ImportJob;
    await this.importJobs.insertOne({
      _id: importJobId,
      account,
      status: "in_progress",
      connectionsImported: 0,
      startedAt: new Date(),
    });

    try {
      // Parse CSV
      const parseResult = this.parseCSV(csvContent);
      if ("error" in parseResult) {
        await this.importJobs.updateOne(
          { _id: importJobId },
          {
            $set: {
              status: "failed",
              errorMessage: parseResult.error,
              completedAt: new Date(),
            },
          },
        );
        return { error: parseResult.error };
      }

      const { headers, rows } = parseResult;
      console.log(`[LinkedInImport] Parsed CSV: ${rows.length} rows with headers:`, headers);

      // Use LLM to map CSV fields
      const mappingResult = await this.mapCSVFieldsWithLLM(headers);
      if ("error" in mappingResult) {
        await this.importJobs.updateOne(
          { _id: importJobId },
          {
            $set: {
              status: "failed",
              errorMessage: mappingResult.error,
              completedAt: new Date(),
            },
          },
        );
        return { error: mappingResult.error };
      }

      const fieldMapping = mappingResult;
      console.log(`[LinkedInImport] Field mapping:`, fieldMapping);

      // Process each row
      let connectionsImported = 0;
      const errors: string[] = [];
      console.log(`[LinkedInImport] Processing ${rows.length} rows...`);

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        if (row.length !== headers.length) {
          errors.push(
            `Row ${rowIndex + 2}: column count mismatch (expected ${headers.length}, got ${row.length})`,
          );
          continue;
        }

        // Build connection data from CSV row using mapping
        const connectionData: {
          account: LinkedInAccount;
          linkedInConnectionId: string;
          firstName?: string;
          lastName?: string;
          headline?: string;
          location?: string;
          industry?: string;
          currentPosition?: string;
          currentCompany?: string;
          profileUrl?: string;
          profilePictureUrl?: string;
          summary?: string;
          skills?: string[];
          education?: Array<{
            school?: string;
            degree?: string;
            fieldOfStudy?: string;
            startYear?: number;
            endYear?: number;
          }>;
          experience?: Array<{
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
          }>;
          rawData?: Record<string, unknown>;
        } = {
          account,
          linkedInConnectionId: "", // Will be set from CSV or generated
        };

        // Map CSV values to connection fields
        const rawRowData: Record<string, string> = {};
        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
          const csvHeader = headers[colIndex];
          const csvValue = row[colIndex];
          rawRowData[csvHeader] = csvValue;

          const mappedField = fieldMapping[csvHeader];
          if (mappedField && csvValue && csvValue.trim() !== "") {
            if (mappedField === "linkedInConnectionId") {
              connectionData.linkedInConnectionId = csvValue.trim();
            } else if (mappedField === "firstName") {
              connectionData.firstName = csvValue.trim();
            } else if (mappedField === "lastName") {
              connectionData.lastName = csvValue.trim();
            } else if (mappedField === "headline") {
              connectionData.headline = csvValue.trim();
            } else if (mappedField === "location") {
              connectionData.location = csvValue.trim();
            } else if (mappedField === "industry") {
              connectionData.industry = csvValue.trim();
            } else if (mappedField === "currentPosition") {
              connectionData.currentPosition = csvValue.trim();
            } else if (mappedField === "currentCompany") {
              connectionData.currentCompany = csvValue.trim();
            } else if (mappedField === "profileUrl") {
              connectionData.profileUrl = csvValue.trim();
            } else if (mappedField === "profilePictureUrl") {
              connectionData.profilePictureUrl = csvValue.trim();
            } else if (mappedField === "summary") {
              connectionData.summary = csvValue.trim();
            } else if (mappedField === "skills") {
              // Parse comma-separated skills
              connectionData.skills = csvValue
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            }
            // Note: education and experience would need more complex parsing
            // For now, we'll store them in rawData if present
          }
        }

        // Store raw CSV row data
        connectionData.rawData = rawRowData;

        // Generate linkedInConnectionId if not provided
        if (!connectionData.linkedInConnectionId || connectionData.linkedInConnectionId.trim() === "") {
          // Extract LinkedIn ID from profile URL if available
          let fallbackId: string;
          if (connectionData.profileUrl) {
            // Extract LinkedIn username from URL (e.g., https://www.linkedin.com/in/username -> username)
            const urlMatch = connectionData.profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
            fallbackId = urlMatch ? urlMatch[1] : connectionData.profileUrl;
          } else {
            // Use name combination or row index as fallback
            const nameCombo = `${connectionData.firstName || ""}_${connectionData.lastName || ""}`.trim();
            fallbackId = nameCombo || `connection_${rowIndex}`;
          }
          connectionData.linkedInConnectionId = fallbackId;
        }

        // Add connection
        const addResult = await this.addConnection(connectionData);
        if ("error" in addResult) {
          const errorMsg = `Row ${rowIndex + 2}: ${addResult.error}`;
          errors.push(errorMsg);
          // Log first few errors for debugging
          if (errors.length <= 5) {
            console.error(`[LinkedInImport] ${errorMsg}`);
            console.error(`[LinkedInImport] Row data:`, {
              linkedInConnectionId: connectionData.linkedInConnectionId,
              firstName: connectionData.firstName,
              lastName: connectionData.lastName,
              profileUrl: connectionData.profileUrl,
            });
          }
        } else {
          connectionsImported++;
        }
      }

      // Update import job
      const finalStatus = errors.length === 0 ? "completed" : "failed";
      console.log(`[LinkedInImport] Import complete: ${connectionsImported}/${rows.length} connections imported, ${errors.length} errors`);
      if (errors.length > 0 && errors.length <= 10) {
        console.log(`[LinkedInImport] Errors:`, errors);
      } else if (errors.length > 10) {
        console.log(`[LinkedInImport] First 10 errors:`, errors.slice(0, 10));
        console.log(`[LinkedInImport] ... and ${errors.length - 10} more errors`);
      }

      await this.importJobs.updateOne(
        { _id: importJobId },
        {
          $set: {
            status: finalStatus,
            connectionsImported,
            connectionsTotal: rows.length,
            errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
            completedAt: new Date(),
          },
        },
      );

      // Update lastImportedAt on account if successful
      if (finalStatus === "completed" && connectionsImported > 0) {
        await this.accounts.updateOne(
          { _id: account },
          { $set: { lastImportedAt: new Date() } },
        );
      }

      return { importJob: importJobId, connectionsImported };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      await this.importJobs.updateOne(
        { _id: importJobId },
        {
          $set: {
            status: "failed",
            errorMessage: `Unexpected error: ${err.message}`,
            completedAt: new Date(),
          },
        },
      );
      return { error: `Import failed: ${err.message}` };
    }
  }

  /**
   * Action: Imports connections from a JSON array using LLM to map fields.
   * importConnectionsFromJSON (account: LinkedInAccount, jsonContent: String): (importJob: ImportJob, connectionsImported: Number)
   *
   * **requires**:
   *   - A LinkedInAccount with the given account ID exists.
   *   - jsonContent is not empty and is valid JSON.
   *   - GEMINI_API_KEY environment variable is set.
   *
   * **effects**:
   *   - Parses the JSON content (expects an array of connection objects).
   *   - Uses LLM to map JSON keys to ConnectionDoc fields.
   *   - Creates an ImportJob with status "in_progress".
   *   - Processes each JSON object and calls addConnection for each.
   *   - Updates ImportJob status to "completed" or "failed".
   *   - Returns the importJob ID and number of connections imported.
   */
  async importConnectionsFromJSON({
    account,
    jsonContent,
  }: {
    account: LinkedInAccount;
    jsonContent: string;
  }): Promise<
    | { importJob: ImportJob; connectionsImported: number }
    | { error: string }
  > {
    // Validate account exists
    const existingAccount = await this.accounts.findOne({ _id: account });
    if (!existingAccount) {
      return { error: `LinkedIn account with ID ${account} not found.` };
    }

    // Validate JSON content
    if (!jsonContent || jsonContent.trim() === "") {
      return { error: "JSON content is required and cannot be empty" };
    }

    // Create import job
    const importJobId = freshID() as ImportJob;
    await this.importJobs.insertOne({
      _id: importJobId,
      account,
      status: "in_progress",
      connectionsImported: 0,
      startedAt: new Date(),
    });

    try {
      // Parse JSON
      let connectionsArray: Record<string, unknown>[];
      try {
        const parsed = JSON.parse(jsonContent);
        if (Array.isArray(parsed)) {
          connectionsArray = parsed;
        } else if (typeof parsed === "object" && parsed !== null) {
          // If it's a single object, wrap it in an array
          connectionsArray = [parsed];
        } else {
          throw new Error("JSON must be an object or array of objects");
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        await this.importJobs.updateOne(
          { _id: importJobId },
          {
            $set: {
              status: "failed",
              errorMessage: `Invalid JSON: ${err.message}`,
              completedAt: new Date(),
            },
          },
        );
        return { error: `Invalid JSON: ${err.message}` };
      }

      if (connectionsArray.length === 0) {
        await this.importJobs.updateOne(
          { _id: importJobId },
          {
            $set: {
              status: "failed",
              errorMessage: "JSON array is empty",
              completedAt: new Date(),
            },
          },
        );
        return { error: "JSON array is empty" };
      }

      // Get all unique keys from the first few objects to map
      const sampleKeys = new Set<string>();
      for (let i = 0; i < Math.min(5, connectionsArray.length); i++) {
        Object.keys(connectionsArray[i]).forEach((key) => sampleKeys.add(key));
      }
      const jsonKeys = Array.from(sampleKeys);

      // Use LLM to map JSON fields
      const mappingResult = await this.mapJSONFieldsWithLLM(jsonKeys);
      if ("error" in mappingResult) {
        await this.importJobs.updateOne(
          { _id: importJobId },
          {
            $set: {
              status: "failed",
              errorMessage: mappingResult.error,
              completedAt: new Date(),
            },
          },
        );
        return { error: mappingResult.error };
      }

      const fieldMapping = mappingResult;

      // Process each connection object
      let connectionsImported = 0;
      const errors: string[] = [];

      for (let objIndex = 0; objIndex < connectionsArray.length; objIndex++) {
        const connectionObj = connectionsArray[objIndex];

        // Build connection data from JSON object using mapping
        const connectionData: {
          account: LinkedInAccount;
          linkedInConnectionId: string;
          firstName?: string;
          lastName?: string;
          headline?: string;
          location?: string;
          industry?: string;
          currentPosition?: string;
          currentCompany?: string;
          profileUrl?: string;
          profilePictureUrl?: string;
          summary?: string;
          skills?: string[];
          education?: Array<{
            school?: string;
            degree?: string;
            fieldOfStudy?: string;
            startYear?: number;
            endYear?: number;
          }>;
          experience?: Array<{
            title?: string;
            company?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
          }>;
          rawData?: Record<string, unknown>;
        } = {
          account,
          linkedInConnectionId: "", // Will be set from JSON or generated
        };

        // Map JSON values to connection fields
        const rawObjData: Record<string, unknown> = {};
        for (const [jsonKey, jsonValue] of Object.entries(connectionObj)) {
          rawObjData[jsonKey] = jsonValue;

          const mappedField = fieldMapping[jsonKey];
          if (mappedField && jsonValue !== null && jsonValue !== undefined) {
            const stringValue = String(jsonValue).trim();
            if (stringValue === "") continue;

            if (mappedField === "linkedInConnectionId") {
              connectionData.linkedInConnectionId = stringValue;
            } else if (mappedField === "firstName") {
              connectionData.firstName = stringValue;
            } else if (mappedField === "lastName") {
              connectionData.lastName = stringValue;
            } else if (mappedField === "headline") {
              connectionData.headline = stringValue;
            } else if (mappedField === "location") {
              connectionData.location = stringValue;
            } else if (mappedField === "industry") {
              connectionData.industry = stringValue;
            } else if (mappedField === "currentPosition") {
              connectionData.currentPosition = stringValue;
            } else if (mappedField === "currentCompany") {
              connectionData.currentCompany = stringValue;
            } else if (mappedField === "profileUrl") {
              connectionData.profileUrl = stringValue;
            } else if (mappedField === "profilePictureUrl") {
              connectionData.profilePictureUrl = stringValue;
            } else if (mappedField === "summary") {
              connectionData.summary = stringValue;
            } else if (mappedField === "skills") {
              // Handle skills as array
              if (Array.isArray(jsonValue)) {
                connectionData.skills = jsonValue
                  .map((s) => String(s).trim())
                  .filter((s) => s.length > 0);
              } else {
                connectionData.skills = stringValue
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0);
              }
            } else if (mappedField === "education") {
              // Handle education as array
              if (Array.isArray(jsonValue)) {
                connectionData.education = jsonValue.map((edu) => {
                  if (typeof edu === "object" && edu !== null) {
                    return {
                      school: edu.school ? String(edu.school) : undefined,
                      degree: edu.degree ? String(edu.degree) : undefined,
                      fieldOfStudy: edu.fieldOfStudy
                        ? String(edu.fieldOfStudy)
                        : undefined,
                      startYear:
                        typeof edu.startYear === "number"
                          ? edu.startYear
                          : undefined,
                      endYear:
                        typeof edu.endYear === "number" ? edu.endYear : undefined,
                    };
                  }
                  return {};
                });
              }
            } else if (mappedField === "experience") {
              // Handle experience as array
              if (Array.isArray(jsonValue)) {
                connectionData.experience = jsonValue.map((exp) => {
                  if (typeof exp === "object" && exp !== null) {
                    return {
                      title: exp.title ? String(exp.title) : undefined,
                      company: exp.company ? String(exp.company) : undefined,
                      startDate: exp.startDate ? String(exp.startDate) : undefined,
                      endDate: exp.endDate ? String(exp.endDate) : undefined,
                      description: exp.description
                        ? String(exp.description)
                        : undefined,
                    };
                  }
                  return {};
                });
              }
            }
          }
        }

        // Store raw JSON object data
        connectionData.rawData = rawObjData;

        // Generate linkedInConnectionId if not provided
        if (
          !connectionData.linkedInConnectionId ||
          connectionData.linkedInConnectionId.trim() === ""
        ) {
          // Use email, profile URL, or name combination as fallback
          const fallbackId =
            connectionData.profileUrl ||
            `${connectionData.firstName || ""}_${connectionData.lastName || ""}`.trim() ||
            `connection_${objIndex}`;
          connectionData.linkedInConnectionId = fallbackId;
        }

        // Add connection
        const addResult = await this.addConnection(connectionData);
        if ("error" in addResult) {
          errors.push(`Object ${objIndex + 1}: ${addResult.error}`);
        } else {
          connectionsImported++;
        }
      }

      // Update import job
      const finalStatus = errors.length === 0 ? "completed" : "failed";
      await this.importJobs.updateOne(
        { _id: importJobId },
        {
          $set: {
            status: finalStatus,
            connectionsImported,
            connectionsTotal: connectionsArray.length,
            errorMessage:
              errors.length > 0 ? errors.join("; ") : undefined,
            completedAt: new Date(),
          },
        },
      );

      // Update lastImportedAt on account if successful
      if (finalStatus === "completed" && connectionsImported > 0) {
        await this.accounts.updateOne(
          { _id: account },
          { $set: { lastImportedAt: new Date() } },
        );
      }

      return { importJob: importJobId, connectionsImported };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      await this.importJobs.updateOne(
        { _id: importJobId },
        {
          $set: {
            status: "failed",
            errorMessage: `Unexpected error: ${err.message}`,
            completedAt: new Date(),
          },
        },
      );
      return { error: `Import failed: ${err.message}` };
    }
  }
}
