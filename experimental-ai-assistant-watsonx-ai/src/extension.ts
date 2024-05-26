import * as vscode from 'vscode';
import axios from 'axios';
import * as path from 'path';

async function authenticate(): Promise<string> {
    const config = vscode.workspace.getConfiguration('myExtension');
    let apiKey = config.get('apiKey') as string;
    const url = 'https://iam.cloud.ibm.com/identity/token';
    const data = `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${encodeURIComponent(apiKey)}`;
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };

    try {
        const response = await axios.post(url, data, { headers });
        return response.data.access_token;  // Assuming the token is returned under access_token
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            console.error('Authentication failed:', error.response.data);
        } else {
            console.error('Error sending request:', error);
        }
        throw error;  // Re-throw to handle it outside or inform the user accordingly
    }
}

class MyCustomViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'myCustomView';

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken) {
        webviewView.webview.options = {
            enableScripts: true
        };

        const htmlContent = this.getHtmlForWebview(webviewView.webview);
        console.log('Setting HTML content:', htmlContent);
        webviewView.webview.html = htmlContent;

        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'submit':
                    //webviewView.webview.postMessage({ message: 'Hello from the extension!', timestamp: new Date().toLocaleTimeString() });
                    //vscode.window.showInformationMessage(`Received: ${data.value}`);
                    vscode.commands.executeCommand('extension.processData', data.value, webviewView.webview);
                    break;
                case 'submit1':
                    vscode.commands.executeCommand('extension.processData2', data.value,webviewView.webview);
                    break;
            } 
                
        });
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'style.css'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Custom View</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                }
                .container {
                    display: flex;
                    align-items: center;
                }
                textarea {
                    flex: 1;
                    margin-right: 10px;
                    padding: 10px;
                    resize: none;
                    font-size: 14px;
                    width: 70%;
                    height: 100px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    border: 1px solid var(--vscode-editor-border);
                    border-radius: 4px;
                }
                button {
                    padding: 10px 20px;
                    font-size: 14px;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
            </style>
        </head>
        <body>
           
            <div class="container">
                <textarea id="area" placeholder="Hi, I am an Experimental Code Assistant Powered by Watsonx.AI;I can help you write code,explain code snippets,convert code from one language to another and create unit tests; Tell me what do you want to create"></textarea>
                <button id="submitButton">Submit</button>
                <button id="askWatsonButton">Ask watsonx.ai</button>
            </div>
            <div><p id="watsonx"></p></div>
            <script>
            const vscode = acquireVsCodeApi();
            function typeText(element, text) {
                element.innerHTML = ''; // Clear previous text
                const words = text.split(' ');
                let index = 0;
                function addWord() {
                    if (index < words.length) {
                        element.innerHTML += (index > 0 ? ' ' : '') + words[index];
                        index++;
                        setTimeout(addWord, 100); // Adjust the delay as needed
                    }
                }
                addWord();
            }
    
            document.getElementById('submitButton').addEventListener('click', () => {
                const textAreaValue = document.querySelector('#area').value;
                vscode.postMessage({ type: 'submit', value: textAreaValue });
                document.querySelector('#area').value = ""; // Clear textarea correctly
            });
    
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.type) {
                    case 'updateTextArea':
                        typeText(document.querySelector('#watsonx'), message.value);
                        break;
                    case 'updateTextArea2':
                        typeText(document.querySelector('#watsonx'), message.value);
                        break;
                }
            });
    
            document.getElementById('askWatsonButton').addEventListener('click', () => {
                const textAreaValue = document.querySelector('#area').value;
                vscode.postMessage({ type: 'submit1', value: textAreaValue });
            });
        </script>
        </body>
        </html>`;
    }
}

export function activate(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration('myExtension');
    const apiKey = config.get('apiKey');
    const myUrl = config.get('url') as string;
    const projectId = config.get('projectId');
    const modelType = config.get('modelType') as string;



    console.log('Congratulations, your extension "helloworld" is now active!');

    let bearer_token: string;

    const processData2 = async(sdata: string, webview: vscode.Webview)=>{
        console.log("getting into Proces2");

        try {
            bearer_token = await authenticate();
        } catch (error) {
            vscode.window.showErrorMessage('Error authenticating: ' + error);
            return;
        }

        const escapedData = sdata.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
        const postData = {
            input: `context: ${escapedData}`,
            parameters: {
                decoding_method: 'greedy',
                max_new_tokens: 1000,
                min_new_tokens: 0,
                stop_sequences: [],
                repetition_penalty: 1
            },
            model_id: modelType,
            project_id: projectId,//'2bd2fef2-9902-41f4-b67a-b35ac6fca32d',
            moderations: {
                hap: {
                    input: {
                        enabled: true,
                        threshold: 0.5,
                        mask: {
                            remove_entity_value: true
                        }
                    },
                    output: {
                        enabled: true,
                        threshold: 0.5,
                        mask: {
                            remove_entity_value: true
                        }
                    }
                }
            }
        };
        try {
            const response = await axios.post(myUrl, postData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${bearer_token}`
                }
            });

            interface JsonResponse {
                model_id: string;
                created_at: string;
                results: Array<{
                    generated_text: string;
                    generated_token_count?: number;
                }>;
            }

            const jsonResponse = response.data as JsonResponse;
            const generatedText = jsonResponse.results[0].generated_text;
            vscode.window.showInformationMessage(generatedText);
            webview.postMessage({ type: 'updateTextArea2', value: generatedText });
            
        } catch (error) {
            vscode.window.showErrorMessage('Error creating the code: ' + error + '. Try again. Token is ' + bearer_token);
            bearer_token = await authenticate();
        }
       
    };

 

    const processData = async (mdata: string, webview: vscode.Webview) => {
        try {
            bearer_token = await authenticate();
        } catch (error) {
            vscode.window.showErrorMessage('Error authenticating: ' + error);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const postData = {
                input: `context: you are an expert code in various programming languages. Your job is to write concise and clean code in any programming language given. you will detect the programming language detected in the given text and create the code; you ensure the code contains the right libraries.\n Only print the required code and do not repeat the answer.\n\nexample :\n\nCode description\nScala code example that demonstrates reading a file and counting the occurrences of each word in the file. This is a practical example that can be useful for text processing or data analysis tasks.\n\ngenerated code \nimport scala.io.Source\n\nobject WordCount {\n  def main(args: Array[String]): Unit = {\n    if (args.length != 1) {\n      println(\"Usage: scala WordCount <file>\")\n      sys.exit(1)\n    }\n\n    val filename = args(0)\n    val source = Source.fromFile(filename)\n\n    try {\n      val lines = source.getLines().toList\n      val wordCounts = lines\n        .flatMap(_.split(\"\\\\W+\")) // Split lines into words\n        .filter(_.nonEmpty) // Filter out empty words\n        .map(_.toLowerCase) // Convert words to lowercase\n        .groupBy(identity) // Group by word\n        .mapValues(_.size) // Count occurrences\n\n      // Print the word counts\n      wordCounts.toSeq.sortBy(-_._2).foreach {\n        case (word, count) => println(s\"$word: $count\")\n      }\n    } finally {\n      source.close()\n    }\n  }\n}\n\ngenerate code for this code description \n${mdata}`,
                parameters: {
                    decoding_method: 'greedy',
                    max_new_tokens: 1000,
                    min_new_tokens: 0,
                    stop_sequences: [],
                    repetition_penalty: 1
                },
                model_id: modelType,
                project_id: projectId,//'2bd2fef2-9902-41f4-b67a-b35ac6fca32d',
                moderations: {
                    hap: {
                        input: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        },
                        output: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        }
                    }
                }
            };

            try {
                const response = await axios.post(myUrl, postData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${bearer_token}`
                    }
                });

                interface JsonResponse {
                    model_id: string;
                    created_at: string;
                    results: Array<{
                        generated_text: string;
                        generated_token_count?: number;
                    }>;
                }

                const jsonResponse = response.data as JsonResponse;
                const generatedText = jsonResponse.results[0].generated_text;
                const position = editor.selection.active; // Current cursor position
                const newPosition = position.translate(1, 0);

                editor.edit(editBuilder => {
                    editBuilder.insert(newPosition, `\n${generatedText}`);
                });

                
            } catch (error) {
                vscode.window.showErrorMessage('Error creating the code: ' + error + '. Try again. Token is ' + bearer_token);
                bearer_token = await authenticate();
            }
            webview.postMessage({ type: 'updateTextArea', value: "" });
        }
        
    };

    let convertCode = vscode.commands.registerCommand('extension.convert',async () => {
                // Show an input box to the user
                const userInput = await vscode.window.showInputBox({
                    placeHolder: 'Enter a value',
                    prompt: 'Which programming language you would like to convert the selected code snippet ?'
                });
                try {
                    bearer_token = await authenticate();
                } catch (error) {
                    vscode.window.showErrorMessage('Error authenticating: ' + error);
                    return;
                }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);

            const postData = {
                input: `Context : You are an expert in multiple programming languages and have the capability to identify the programming language of given code snippets. Your task is to detect the programming language of the provided code snippet and convert it to the specified destination programming language.\n\nIdentify the programming language of the following code snippet.\nTranslate the code snippet to ${userInput} programming language: ${selectedText}; only return the converted code with no other information.`,
                parameters: {
                    decoding_method: 'greedy',
                    max_new_tokens: 1000,
                    min_new_tokens: 0,
                    stop_sequences: [],
                    repetition_penalty: 1
                },
                model_id: modelType,
                project_id: projectId,
                moderations: {
                    hap: {
                        input: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        },
                        output: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        }
                    }
                }
            };

            try {
                const response = await axios.post(myUrl, postData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${bearer_token}`
                    }
                });

                interface JsonResponse {
                    model_id: string;
                    created_at: string;
                    results: Array<{
                        generated_text: string;
                        generated_token_count?: number;
                    }>;
                }

                const jsonResponse = response.data as JsonResponse;
                const generatedText = jsonResponse.results[0].generated_text;
                vscode.window.showInformationMessage(generatedText);

                const outputChannel = vscode.window.createOutputChannel("Code Explainer");
                outputChannel.show(true);
                outputChannel.appendLine(generatedText);
                console.log(generatedText);

                // Create and write to a new file in the current workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                const workspacePath = workspaceFolders[0].uri.fsPath;
                const newFilePath = path.join(workspacePath, userInput as string +"_converted");
                const newFileUri = vscode.Uri.file(newFilePath);

                const encoder = new TextEncoder();
                const fileContent = encoder.encode(generatedText);

                await vscode.workspace.fs.writeFile(newFileUri, fileContent);
                vscode.window.showInformationMessage(`Result written to ${newFilePath}`);
            } else {
                vscode.window.showErrorMessage('No workspace folder is open');
            }
            } catch (error) {
                vscode.window.showErrorMessage('Error explaining the code: ' + error + '. Try again. Token: ' + bearer_token);
                bearer_token = await authenticate();
            }
        }
        
    });

    let disposable = vscode.commands.registerCommand('extension.create', async () => {
        try {
            bearer_token = await authenticate();
        } catch (error) {
            vscode.window.showErrorMessage('Error authenticating: ' + error);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);

            const postData = {
                input: `context: you are an expert code in various programming languages. Your job is to write concise and clean code in any programming language given. you will detect the programming language detected in the given text and create the code; you ensure the code contains the right libraries.\n Only print the required code and do not repeat the answer.\n\nexample :\n\nCode description\nScala code example that demonstrates reading a file and counting the occurrences of each word in the file. This is a practical example that can be useful for text processing or data analysis tasks.\n\ngenerated code \nimport scala.io.Source\n\nobject WordCount {\n  def main(args: Array[String]): Unit = {\n    if (args.length != 1) {\n      println(\"Usage: scala WordCount <file>\")\n      sys.exit(1)\n    }\n\n    val filename = args(0)\n    val source = Source.fromFile(filename)\n\n    try {\n      val lines = source.getLines().toList\n      val wordCounts = lines\n        .flatMap(_.split(\"\\\\W+\")) // Split lines into words\n        .filter(_.nonEmpty) // Filter out empty words\n        .map(_.toLowerCase) // Convert words to lowercase\n        .groupBy(identity) // Group by word\n        .mapValues(_.size) // Count occurrences\n\n      // Print the word counts\n      wordCounts.toSeq.sortBy(-_._2).foreach {\n        case (word, count) => println(s\"$word: $count\")\n      }\n    } finally {\n      source.close()\n    }\n  }\n}\n\ngenerate code for this code description\n${selectedText}`,
                parameters: {
                    decoding_method: 'greedy',
                    max_new_tokens: 1000,
                    min_new_tokens: 0,
                    stop_sequences: [],
                    repetition_penalty: 1
                },
                model_id: modelType,
                project_id: projectId,
                moderations: {
                    hap: {
                        input: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        },
                        output: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        }
                    }
                }
            };

            try {
                const response = await axios.post(myUrl, postData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${bearer_token}`
                    }
                });

                interface JsonResponse {
                    model_id: string;
                    created_at: string;
                    results: Array<{
                        generated_text: string;
                        generated_token_count?: number;
                    }>;
                }

                const jsonResponse = response.data as JsonResponse;
                const generatedText = jsonResponse.results[0].generated_text;
                const position = editor.selection.active; // Current cursor position
                const newPosition = position.translate(1, 0);

                editor.edit(editBuilder => {
                    editBuilder.insert(newPosition, `\n${generatedText}`);
                });
            } catch (error) {
                vscode.window.showErrorMessage('Error creating the code: ' + error + '. Try again. Token is ' + bearer_token);
                bearer_token = await authenticate();
            }
        }
    });

    let configure = vscode.commands.registerCommand('myExtension.configure', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'myExtension');
    });

    let explain = vscode.commands.registerCommand('extension.explain', async () => {
        try {
            bearer_token = await authenticate();
        } catch (error) {
            vscode.window.showErrorMessage('Error authenticating: ' + error);
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);

            const postData = {
                input: `Context : you are a code assistant; your job is to detect the programming language of the given code and then explain what the code does.\n Only print the required explanation and do not repeat the input. \n\nexample\n<input>\nfrom collections import Counter\n\ndef most_common_element(items):\n    \"\"\"Returns the most common element from the list along with its count.\"\"\"\n    if not items:\n        return None, 0  # Handle empty list case\n\n    item_counts = Counter(items)\n    most_common = item_counts.most_common(1)[0]  # Get the most common element and count\n    return most_common\n\n# Example usage:\nelements = ['apple', 'banana', 'apple', 'orange', 'banana', 'banana']\nelement, count = most_common_element(elements)\nprint(f\"The most common element is '{element}' with a count of {count}.\")\n</input>\n\nExplanation : \nImporting Counter:\n\nThe Counter class from the collections module is a specialized dictionary designed for counting hashable objects. It's an extremely useful tool for this type of task because it automatically counts the occurrences of each element in the list.\nFunction Definition:\n\nmost_common_element(items): Defines a function that accepts a list items and returns the most common element in the list along with its count.\nHandling Empty Lists:\n\nIf the list is empty, the function returns None for the element and 0 for the count. This prevents errors that would arise from trying to find a common element in an empty list.\nUsing Counter to Count Elements:\n\nitem_counts = Counter(items): Creates a Counter object that counts each occurrence of each element in the list.\nThe most_common() method of the Counter object is used to retrieve the most common elements. most_common(1) returns a list of the single most common element and its count as a tuple.\nReturn the Most Common Element and Count:\n\nThe function returns a tuple where the first element is the most common item in the list, and the second element is the count of that item.\nExample Usage:\n\nThe example usage part creates a list of fruit names with some repetitions.\nThe function is called with this list, and it prints out the most common element and its count.\nThis example is handy for any application needing to identify predominant items in datasets, like finding the most commonly used words in text processing, most frequent responses in a survey, or even most visited pages in web analytics.\n</Explanation>\n\nExplain this code: ${selectedText}`,
                parameters: {
                    decoding_method: 'greedy',
                    max_new_tokens: 1000,
                    min_new_tokens: 0,
                    stop_sequences: [],
                    repetition_penalty: 1
                },
                model_id: modelType,
                project_id: projectId,
                moderations: {
                    hap: {
                        input: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        },
                        output: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        }
                    }
                }
            };

            try {
                const response = await axios.post(myUrl, postData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${bearer_token}`
                    }
                });

                interface JsonResponse {
                    model_id: string;
                    created_at: string;
                    results: Array<{
                        generated_text: string;
                        generated_token_count?: number;
                    }>;
                }

                const jsonResponse = response.data as JsonResponse;
                const generatedText = jsonResponse.results[0].generated_text;
                vscode.window.showInformationMessage(generatedText);

                const outputChannel = vscode.window.createOutputChannel("Code Explainer");
                outputChannel.show(true);
                outputChannel.appendLine(generatedText);
                console.log(generatedText);
            } catch (error) {
                vscode.window.showErrorMessage('Error explaining the code: ' + error + '. Try again. Token: ' + bearer_token);
                bearer_token = await authenticate();
            }
        }
    });

    let fix = vscode.commands.registerCommand('extension.fix', () => {
        vscode.window.showInformationMessage('Fixing the selected code...');
    });

    let refactor = vscode.commands.registerCommand('extension.test', async () => {

        try {
            bearer_token = await authenticate();
        } catch (error) {
            vscode.window.showErrorMessage('Error authenticating: ' + error);
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            const selectedText = document.getText(selection);

            const postData = {
                input: `Context : I have the following function in my codebase, and I need to create unit tests for it. Please generate the appropriate unit tests in the detected programming language.\n\nCode :\ndef add(a, b):\n    \"\"\"\n    This function takes two numbers and returns their sum.\n    \"\"\"\n    return a + b\n\nInstructions:\n\n1-Identify the programming language of the provided code.\n2-Generate a set of unit tests for the function.\n3-Ensure the tests cover various scenarios, including edge cases.\n\nAdditional Context:\n\nThe unit tests should follow the best practices for the detected programming language.\nInclude comments in the tests to explain what each test is checking.\nUse a popular testing framework for the detected programming language.\n\nDetected Language : Python\n Generated Unit tests :\nimport unittest\n\nclass TestAddFunction(unittest.TestCase):\n    def test_add_positive_numbers(self):\n        # Test adding two positive numbers\n        self.assertEqual(add(1, 2), 3)\n\n    def test_add_negative_numbers(self):\n        # Test adding two negative numbers\n        self.assertEqual(add(-1, -2), -3)\n\n    def test_add_positive_and_negative_number(self):\n        # Test adding a positive number and a negative number\n        self.assertEqual(add(1, -2), -1)\n\n    def test_add_zero(self):\n        # Test adding zero to a number\n        self.assertEqual(add(0, 5), 5)\n        self.assertEqual(add(5, 0), 5)\n\n    def test_add_large_numbers(self):\n        # Test adding large numbers\n        self.assertEqual(add(1000000, 2000000), 3000000)\n\nif __name__ == '\''__main__'\'':\n    unittest.main()\n\nNow create unit tests for the following code\n\n: ${selectedText}; only return the unit tests  with no other information.`,
                parameters: {
                    decoding_method: 'greedy',
                    max_new_tokens: 1000,
                    min_new_tokens: 0,
                    stop_sequences: [],
                    repetition_penalty: 1
                },
                model_id: modelType,
                project_id: projectId,
                moderations: {
                    hap: {
                        input: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        },
                        output: {
                            enabled: true,
                            threshold: 0.5,
                            mask: {
                                remove_entity_value: true
                            }
                        }
                    }
                }
            };

            try {
                const response = await axios.post(myUrl, postData, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${bearer_token}`
                    }
                });

                interface JsonResponse {
                    model_id: string;
                    created_at: string;
                    results: Array<{
                        generated_text: string;
                        generated_token_count?: number;
                    }>;
                }

                const jsonResponse = response.data as JsonResponse;
                const generatedText = jsonResponse.results[0].generated_text;
                vscode.window.showInformationMessage(generatedText);

                const outputChannel = vscode.window.createOutputChannel("Code Explainer");
                outputChannel.show(true);
                outputChannel.appendLine(generatedText);
                console.log(generatedText);

                // Create and write to a new file in the current workspace
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders) {
                const workspacePath = workspaceFolders[0].uri.fsPath;
                const newFilePath = path.join(workspacePath, "_UnitTestCases");
                const newFileUri = vscode.Uri.file(newFilePath);

                const encoder = new TextEncoder();
                const fileContent = encoder.encode(generatedText);

                await vscode.workspace.fs.writeFile(newFileUri, fileContent);
                vscode.window.showInformationMessage(`Result written to ${newFilePath}`);
            } else {
                vscode.window.showErrorMessage('No workspace folder is open');
            }
            } catch (error) {
                vscode.window.showErrorMessage('Error explaining the code: ' + error + '. Try again. Token: ' + bearer_token);
                bearer_token = await authenticate();
            }
        }

        //vscode.window.showInformationMessage('Create unit test code: ' + modelType);
    });

    const viewProvider = new MyCustomViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(MyCustomViewProvider.viewType, viewProvider)
    );
    const processCommand = vscode.commands.registerCommand('extension.processData', processData);
    const askWatson = vscode.commands.registerCommand('extension.processData2',processData2)

    context.subscriptions.push(processCommand,askWatson);
    context.subscriptions.push(disposable, configure, explain, fix, refactor,convertCode);
}

export function deactivate() {}
