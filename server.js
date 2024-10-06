const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'yourSecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const config = {
    user: 'admin',
    password: '76724713076Ui',
    server: 'localhost',
    database: 'master',
    options: {
        trustServerCertificate: true
    }
};

app.get('/', (req, res) => {
    if (req.session.user) {
        return showUserOrAdminPanel(req, res);
    }
    res.send(`
        <h2>Login Page</h2>
        <form method="POST" action="/login">
            <label>Username: <input type="text" name="username" required></label><br>
            <label>Password: <input type="password" name="password" required></label><br>
            <button type="submit">Login</button>
        </form>
    `);
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        await sql.connect(config);
        const result = await sql.query`SELECT * FROM Users WHERE username = ${username} AND password = ${password}`;

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            req.session.user = user;
            return showUserOrAdminPanel(req, res);
        } else {
            res.send(`<h2>Invalid username or password</h2>`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error connecting to the database");
    }
});

async function showUserOrAdminPanel(req, res) {
    try {
        const itemsResult = await sql.query`SELECT * FROM Items`;
        let itemsTable = `
            <h2>${req.session.user.isAdmin ? 'Admin Panel' : 'Items List'}</h2>
            <table border="1">
                <tr><th>Image</th><th>Name</th><th>Description</th>${req.session.user.isAdmin ? '<th>Actions</th>' : ''}</tr>`;

        itemsResult.recordset.forEach(item => {
            itemsTable += `
                <tr>
                    <td><img src="${item.img}" width="50"></td>
                    <td><span class="name">${item.name}</span></td>
                    <td><span class="desc">${item.description}</span></td>`;

            if (req.session.user.isAdmin) {
                itemsTable += `
                    <td>
                        <button onclick="editItem(${item.id})">Edit</button>
                        <button onclick="deleteItem(${item.id})">Delete</button>
                    </td>`;
            }

            itemsTable += `</tr>`;
        });

        itemsTable += `</table>`;

        if (req.session.user.isAdmin) {
            itemsTable += `
                <br><button onclick="addItem()">Add Item</button>
                <script>
                    function addItem() {
                        let name = prompt("Enter item name:");
                        let description = prompt("Enter item description:");
                        let img = prompt("Enter image URL:");
                        if(name && description && img) {
                            window.location.href = \`/add-item?name=\${name}&description=\${description}&img=\${img}\`;
                        }
                    }
                    function deleteItem(id) {
                        if(confirm("Are you sure you want to delete this item?")) {
                            window.location.href = '/delete-item/' + id;
                        }
                    }
                    function editItem(id) {
                        let name = prompt("Enter new name:");
                        let description = prompt("Enter new description:");
                        let img = prompt("Enter new image URL:");
                        if(name && description && img) {
                            window.location.href = \`/edit-item?id=\${id}&name=\${name}&description=\${description}&img=\${img}\`;
                        }
                    }
                </script>`;
        }

        res.send(itemsTable);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error connecting to the database");
    }
}

app.get('/add-item', async (req, res) => {
    const { name, description, img } = req.query;
    try {
        await sql.connect(config);
        await sql.query`INSERT INTO Items (name, description, img) VALUES (${name}, ${description}, ${img})`;
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding item");
    }
});

app.get('/delete-item/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await sql.connect(config);
        await sql.query`DELETE FROM Items WHERE id = ${id}`;
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting item");
    }
});

app.get('/edit-item', async (req, res) => {
    const { id, name, description, img } = req.query;
    try {
        await sql.connect(config);
        await sql.query`UPDATE Items SET name = ${name}, description = ${description}, img = ${img} WHERE id = ${id}`;
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error editing item");
    }
});

app.listen(8080, () => {
    console.log('Server is running on http://localhost:8080');
});
