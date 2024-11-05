import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { writeFile } from 'fs/promises';

(async () => {
    // Fetch the Markdown file
    const response = await fetch('https://raw.githubusercontent.com/wiki/TeamPiped/Piped/Instances.md');
    const markdown = await response.text();

    // Parse the Markdown to generate an AST
    const tree = unified()
        .use(remarkParse)
        .use(remarkGfm) // Add GFM plugin
        .parse(markdown);

    interface Table {
        headers: string[];
        data: Record<string, string>[];
    }

    const tables: Table[] = [];

    // Visit the AST to extract tables
    visit(tree, 'table', (node: any) => {
        const tableNode = node;
        const rows = tableNode.children;

        if (rows.length < 2) return; // Skip if not a valid table

        const headerRow = rows[0];
        const dataRows = rows.slice(1);

        const headers = headerRow.children.map((cellNode: any) => {
            return extractText(cellNode).trim();
        });

        const tableData = dataRows.map((rowNode: any) => {
            const rowData: Record<string, string> = {};
            rowNode.children.forEach((cellNode: any, index: number) => {
                const cellContent = extractText(cellNode).trim();
                const header = headers[index] || `Column${index}`;
                rowData[header] = cellContent;
            });
            return rowData;
        });

        tables.push({
            headers,
            data: tableData
        });
    });

    // Fetch summary.json
    const summaryResponse = await fetch('https://raw.githubusercontent.com/TeamPiped/piped-uptime/refs/heads/master/history/summary.json');
    const summaryJson = await summaryResponse.json();

    // Create a mapping using "Instance API URL" as the key
    const instanceDataMap: Record<string, Record<string, string>> = {};
    tables[0].data.forEach(instance => {
        const apiUrl = normalizeUrl(instance['Instance API URL']);
        instanceDataMap[apiUrl] = instance;
    });

    // Create a mapping from summary.json using the normalized URL
    const summaryDataMap: Record<string, any> = {};
    summaryJson.forEach((item: any) => {
        const url = item.url;
        const baseUrl = normalizeUrl(url);
        summaryDataMap[baseUrl] = item;
    });

    // Prepare an array to store the merged data
    const mergedData: {
        instance: Record<string, string>,
        health: Record<string, any>,
        url: string | null,
        countries?: string[] | null
    }[] = [];

    // For each instance, merge the data and add the 'url' field
    for (const apiUrl in instanceDataMap) {
        const instanceData = instanceDataMap[apiUrl];
        const summaryData = summaryDataMap[apiUrl] || null;

        // Remove unnecessary fields
        delete summaryData['dailyMinutesDown'];
        delete summaryData['uptimeDay'];
        delete summaryData['uptimeWeek'];
        delete summaryData['uptimeMonth'];
        delete summaryData['uptimeYear'];
        delete summaryData['time'];
        delete summaryData['timeDay'];
        delete summaryData['timeWeek'];
        delete summaryData['timeMonth'];
        delete summaryData['timeYear'];

        // Initialize the merged instance data
        let url: string;
        // Get the redirect URL by making a request to 'Instance API URL'
        try {
            const redirectUrl = await fetchRedirectUrl(instanceData['Instance API URL']);
            if (!redirectUrl) {
                console.warn(`No redirect URL found for ${instanceData['Instance API URL']}`);
                continue
            }
            url = redirectUrl;
        } catch (error) {
            console.warn(`Failed fetching redirect URL for ${instanceData['Instance API URL']}:`, (error as Error).message);
            continue
        }
        mergedData.push({
            instance: instanceData,
            health: summaryData,
            url,
            countries: instanceData['Instance Location(s)']
                .split(",")
                .map((country: string) => {
                    const countryEmoji = country.trim().split(' ')[0];
                    return getCountryCodeFromEmoji(countryEmoji);
                })
                .filter((country: string | null) => country !== null) as string[]
        });
    }

    // Get the output file path from command-line arguments
    const outputIndex = process.argv.indexOf('-o');
    const outputPath = outputIndex !== -1 ? process.argv[outputIndex + 1] : null;

    if (outputPath) {
        try {
            await writeFile(outputPath, JSON.stringify(mergedData, null, 2));
            console.log(`Data successfully written to ${outputPath}`);
        } catch (error) {
            console.error(`Error writing to file ${outputPath}:`, error);
        }
    } else {
        console.error("Output path not specified. Use -o to specify the output file path.");
    }

    // Recursive function to extract text from a node
    function extractText(node: any): string {
        if (node.type === 'text') {
            return node.value;
        } else if (['link', 'strong', 'emphasis'].includes(node.type)) {
            return node.children.map((child: any) => extractText(child)).join('');
        } else if (node.type === 'image') {
            return node.alt || '';
        } else if (node.children) {
            return node.children.map((child: any) => extractText(child)).join('');
        } else {
            return '';
        }
    }

    // Function to normalize URLs
    function normalizeUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            let pathname = urlObj.pathname;
            // Remove trailing slashes
            pathname = pathname.replace(/\/+$/, '');
            // Remove '/healthcheck' from the end
            pathname = pathname.replace(/\/healthcheck$/, '');
            urlObj.pathname = pathname;
            return urlObj.origin + urlObj.pathname;
        } catch (e) {
            return url;
        }
    }

    // Function to get the redirect URL from the 'Instance API URL'
    async function fetchRedirectUrl(url: string): Promise<string | null> {
        try {
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'manual',
                signal: AbortSignal.timeout(3000)
            });

            if (response.status === 301 || response.status === 302) {
                const location = response.headers.get('location');
                return location ? location : null;
            } else {
                return null;
            }
        } catch (error) {
            throw error;
        }
    }

    function getCountryCodeFromEmoji(countryEmoji: string): string | null {
        const codePoints = Array.from(countryEmoji).map(char => char.codePointAt(0));
        if (codePoints.length !== 2) {
            return null;
        }
        const countryCode = String.fromCharCode(codePoints[0]! - 127462 + 'A'.charCodeAt(0)) +
            String.fromCharCode(codePoints[1]! - 127462 + 'A'.charCodeAt(0));
        return countryCode;
    }
})();
