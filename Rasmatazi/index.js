const sqlite3 = require("sqlite3").verbose();
const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const codeBoxes = require('./codeBoxes'); 
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');

// Database

const db_name = path.join(__dirname, "data", "apptest.db");
const db = new sqlite3.Database(db_name, err => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Successful connection to the database 'apptest.db'");
});

const sql_create = `CREATE TABLE IF NOT EXISTS Books (
    Book_ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Title VARCHAR(100) NOT NULL,
    Author VARCHAR(100) NOT NULL,
    Comments TEXT
  );`;

db.run(sql_create, err => {
    if (err) {
      return console.error(err.message);
    }
    console.log("Successful creation of the 'Books' table");
});
  
// Database seeding
const sql_insert = `INSERT INTO Books (Book_ID, Title, Author, Comments) VALUES
 (1, 'Mrs. Bridge', 'Evan S. Connell', 'First in the serie'),
 (2, 'Mr. Bridge', 'Evan S. Connell', 'Second in the serie'),
 (3, 'L''ingénue libertine', 'Colette', 'Minne + Les égarements de Minne');`;
 db.run(sql_insert, err => {
   if (err) {
     return console.error(err.message);
   }
   console.log("Successful creation of 3 books");
});

// Creating the Express server
const app = express();

// Server configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));
app.use(session({ secret: "secret", resave: false, saveUninitialized: true }));
app.use(bodyParser.json()); // parse application/json
app.use(bodyParser.urlencoded({ extended: true })); // parse application/x-www-form-urlencoded
app.use(cors());

error=""
const templatesDir = path.join(__dirname, "Project", "templates");

app.get("/", (req, res) => {
  const currentDir = process.cwd();
  const projectDir = path.join(__dirname, "Project");
  const projects = fs.readdirSync(projectDir);

  res.render("index", { error, currentDir, openProject: req.session.openProject, projects, req });
});

app.post("/create-project", (req, res) => {
  try {
    const projectName = req.body["project-name"].trim();
    const projectDirectory = req.body["project-directory"].trim();
    const targetTxt = req.body["target-txt"].trim();

    if (!projectName || !projectDirectory || !targetTxt) {
      return res.status(400).send("Please fill in all fields");
    }

    // Create project directory
    const folderPath = path.join(projectDirectory, projectName);
    try {
      fs.mkdirSync(folderPath);
      console.log(`Project folder created: ${folderPath}`);
    } catch (error) {
      console.log(`Error creating project folder: ${error}`);
      return res.status(500).send(`Error creating project folder: ${error}`);
    }
    const filePath = path.join(folderPath, "target.txt");

    try {
      // Process each line in target-txt input
      const targetTxtLines = targetTxt.split("\n"); // Split input into individual lines
      const processedLines = targetTxtLines.map(line => line.trim().replace(/\/$/, '')); // Remove only the last slash if present for each line
      const targetTxtContent = processedLines.join("\n"); // Join processed lines back into a single string

      fs.writeFileSync(filePath, targetTxtContent); // Write the processed content to target.txt
      console.log(`target.txt file created: ${filePath}`);
    } catch (error) {
      console.log(`Error writing to target.txt: ${error}`);
      return res.status(500).send(`Error writing to target.txt: ${error}`);
    }

    try {
      const targetTxtContent = fs.readFileSync(filePath, "utf8");
      console.log(`target.txt content: ${targetTxtContent}`);
      const targets = targetTxtContent.split("\n").map(target => target.trim()); // Trim each line

      for (let i = 0; i < targets.length; i++) {
        let target = targets[i];
        let targetDomain = target.replace(/^https?:\/\//, '').trim(); // Remove protocol
        targetDomain = targetDomain.replace(/\s/g, ''); // Remove spaces

        // Convert https://example.com, http://example.com, and example.com to https_example.com, http_example.com, and example.com
        if (target.startsWith('https://')) {
          targetDomain = `https_${targetDomain}`;
        } else if (target.startsWith('http://')) {
          targetDomain = `http_${targetDomain}`;
        }

        const targetFolder = path.join(folderPath, targetDomain);

        try {
          fs.mkdirSync(targetFolder);
          console.log(`Target folder created: ${targetFolder}`);
        } catch (error) {
          console.log(`Error creating target folder: ${error}`);
          return res.status(500).send(`Error creating target folder: ${error}`);
        }

        const scansFolderPath = path.join(targetFolder, "scans");
        const exploitFolderPath = path.join(targetFolder, "exploit");
        fs.mkdirSync(scansFolderPath);
        fs.mkdirSync(exploitFolderPath);
      }
    } catch (error) {
      console.log(`Error processing target.txt: ${error}`);
      return res.status(500).send(`Error processing target.txt: ${error}`);
    }
    res.redirect(`/project/${projectName}`);

  } catch (error) {
    console.log(`Error: ${error}`);
    return res.status(500).send(`Error: ${error}`);
  }
});

app.get("/project/:projectName", (req, res) => {
  const projectName = req.params.projectName;
  const projectDir = path.join(__dirname, "Project", projectName);
  const targetTxtPath = path.join(projectDir, "target.txt");

  try {
    const targetTxtContent = fs.readFileSync(targetTxtPath, "utf8");
    const links = targetTxtContent.split("\n").map((link, index) => {
      return { link, url: `/target/${projectName}/${index}` };
    });

    res.render("project", { projectName, links, projectDir, req: req });
  } catch (error) {
    res.status(404).send(`Error: Target.txt file not found for project ${projectName}`);
  }
});

// codeBoxes

app.post("/add-target/:projectName", (req, res) => {
  console.log("Received request to add target:");
  console.log(req.body);

  const projectName = req.params.projectName;
  let targetUrl = req.body['add-target'].trim(); // Remove leading and trailing spaces

  // Validation
  if (!projectName || !targetUrl) {
    console.error("Missing required fields");
    res.status(400).send("Missing required fields");
    return;
  }

  const projectDir = path.join(__dirname, "Project", projectName);
  const targetTxtPath = path.join(projectDir, "target.txt");

  try {
    console.log(`Reading target.txt from ${targetTxtPath}`);
    const targetTxtContent = fs.readFileSync(targetTxtPath, "utf8");
    const targets = targetTxtContent.split("\n");

    targets.push(targetUrl);
    fs.writeFileSync(targetTxtPath, targets.join("\n"));

    console.log(`Target added to ${targetTxtPath}`);

    // Create a directory for the target
    // Replace :// with _ only for folder creation
    const targetFolderName = targetUrl.replace(/:\/\//, '_');
    const targetFolder = path.join(projectDir, targetFolderName);

    try {
      fs.mkdirSync(targetFolder);
      console.log(`Created target folder at ${targetFolder}`);

      // Create scans folder
      const scansFolderPath = path.join(targetFolder, "scans");
      fs.mkdirSync(scansFolderPath);
      console.log(`Scans folder created: ${scansFolderPath}`);
    } catch (error) {
      console.error(`Error creating target folder: ${error}`);
      res.status(500).send(`Error creating target folder: ${error}`);
    }

    // // Check if target folder already exists
    // if (fs.existsSync(targetFolder)) {
    //   console.error("Target folder already exists");
    //   res.status(400).send("Target folder already exists");
    //   return;
    // }

    // fs.mkdirSync(targetFolder);

    // console.log(`Created target folder at ${targetFolder}`);

    // Copy codeBoxes.json to data.json for the new target
    const codeBoxesJsonPath = path.join(__dirname, "codeBoxes.json");
    const dataJsonPath = path.join(targetFolder, "data.json");
    const codeBoxesJsonContent = fs.readFileSync(codeBoxesJsonPath, "utf8");
    fs.writeFileSync(dataJsonPath, codeBoxesJsonContent);

    console.log(`Copied codeBoxes.json to ${dataJsonPath}`);

    res.redirect(`/project/${projectName}`);
  } catch (error) {
    console.error(`Error adding target: ${error}`);
    res.status(500).send(`Error adding target: ${error}`);
  }
});

app.get("/target/:projectName/:index", (req, res) => {
  const projectName = req.params.projectName;
  const index = req.params.index;
  const projectDir = path.join(__dirname, "Project", projectName);
  const targetTxtPath = path.join(projectDir, "target.txt");

  try {
    const targetTxtContent = fs.readFileSync(targetTxtPath, "utf8");
    const links = targetTxtContent.split("\n");
    const target = links[index].trim();
    const projectDir_target = path.join(__dirname, "Project", projectName, target);

    // Extract the hostname or keep the entire target for directory purposes
    const targetDirName = target.replace(/(^\w+:|^)\/\//, '').replace(/\s/g, '');

    // Construct the path based on whether it's http or https
    const protocolPrefix = target.startsWith('https://') ? 'https_' : target.startsWith('http://') ? 'http_' : '';
    const targetFolder = path.join(projectDir, `${protocolPrefix}${targetDirName}`);

    const codeBoxesJsonPath = path.join(process.cwd(), 'codeBoxes.json');
    const codeBoxesJsonContent = fs.readFileSync(codeBoxesJsonPath, "utf8");
    const codeBoxes = JSON.parse(codeBoxesJsonContent);

    const commands = codeBoxes.map((box) => {
      let processedTarget = target;
      
      // If "remove_http" is true, strip the protocol from the target
      if (box.remove_http) {
        processedTarget = target.replace(/(^\w+:|^)\/\//, '');
      }
      
      // Replace all instances of $tpath and $target
      return {
        heading: box.heading,
        commands: box.commands.map((command) => command
          .replace(/\$target/g, processedTarget)  // Global replace for $target
          .replace(/\$tpath/g, targetFolder)      // Global replace for $tpath
        ),
        state: box.state,
        stateColor: box.state_color,
        commandsLength: box.commands.length,
        note: box.note || null,  // Include the note field if it exists
        par: box.par || null  // Include the note field if it exists
      };
    });

    res.render("target", { target, commands, projectDir, projectName, req, targetFolder});
  } catch (error) {
    res.status(404).send(`Error: Target not found for project ${projectName}`);
    console.error(`Error: ${error}`);
  }
});

app.post('/open-target-folder', (req, res) => {
  const targetFolder = req.query.path;

  if (targetFolder) {
    // Use 'exec' to open the folder, depending on the OS
    const openCommand = process.platform === 'win32' ? `start "" "${targetFolder}"` : `open "${targetFolder}"`;
    
    exec(openCommand, (error) => {
      if (error) {
        console.error('Error opening folder:', error);
        return res.status(500).send('Error opening folder.');
      }
      res.send('Target folder opened successfully.');
    });
  } else {
    res.status(400).send('No folder path provided.');
  }
});

app.post('/open-terminal', (req, res) => {
  const folderPath = req.query.path;
  console.log(`Folder path: ${folderPath}`);

  if (folderPath) {
    let openCommand;
    switch (process.platform) {
      case 'win32':
        openCommand = `cmd /k cd /d "${folderPath}"`;
        break;
      case 'linux':
        openCommand = `gnome-terminal --working-directory="${folderPath}"`;
        break;
      default:
        res.status(500).send('Unsupported platform.');
        return;
    }
    console.log(`Open command: ${openCommand}`);

    exec(openCommand, (error) => {
      if (error) {
        console.error('Error opening terminal:', error);
        return res.status(500).send('Error opening terminal.');
      }
      res.send('Terminal opened successfully.');
    });
  } else {
    res.status(400).send('No folder path provided.');
  }
});

app.post('/execute-command', (req, res) => {
  const { command, projectDir } = req.body;
  const exec = require('child_process').exec;

  exec(command, { cwd: projectDir }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running command: ${command}`);
      console.error(error);
      res.status(500).send({ error: 'Error running command' });
    } else {
      console.log(`Command output: ${stdout}`);
      res.send({ output: stdout });
    }
  });
});

app.get("/hello", (req, res) => {
  res.redirect('/hello2')
});

app.get("/hello2", (req, res) => {
  res.send('hello3 this is your link <a href="https://redirectisworking.com">Hello</a>')
});

// Starting the server
app.listen(3000, () => {
    console.log("Server started (http://localhost:3000/) !");
});
