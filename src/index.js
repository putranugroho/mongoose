const express = require('express')
const mongoose = require('mongoose')
const multer = require('multer')
const sharp = require('sharp')
const bcrypt = require('bcrypt')
const cors = require('cors')

const User = require('./model/user')
const Task = require('./model/task')

mongoose.connect('mongodb://127.0.0.1:27017/jc-mongoose', {
    // Parser string URL
    useNewUrlParser: true,

    // ensureIndex(), usang
    // createIndex(), baru
    useCreateIndex: true
})

const app = express()
const port = process.env.PORT || 2019

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send("<h1>API Berhasil di jalankan</h1>")
})

// CREATE
app.post('/users/input', (req, res) => {
    const {name, email, age, password} = req.body

    const data_name = name
    const data_email = email
    const data_password = password
    const data_age = age

    // Create new object user
    const person = new User({
        name: data_name,
        email: data_email,
        password: data_password,
        age: data_age
    })

    // save to database
    person.save()
    .then(result => {
        res.send(result)
    })
    .catch(err =>{
        res.send(err)
    })
})

// Konfigurasi multer
const upload = multer({
    limits: {
        fileSize: 1000000 // Byte
    },
    fileFilter(req, file, cb){
        var boleh = file.originalname.match(/\.(jpg|jpeg|png)$/)

        if(!boleh){ // jika tidak match
            cb(new Error('Please upload file dengan ext .jpg.png.jpeg'))
        }

        // file di terima
        cb(undefined, true)
    }
})

// LOGIN USER
app.post('/users/login', async (req, res) => {
    const data_email = req.body.email
    const data_pass = req.body.password


    try {
        const hasil = await User.loginWithEmail(data_email, data_pass)
        res.send(hasil)
    } catch (error) { // Berasal dari throw di function loginWithEmail
        res.send(error.message)
    }  
})

// CREATE AVATAR
app.post('/users/:id/avatar', upload.single('avatar'), (req,res) => {
    const data_id = req.params.id

    sharp(req.file.buffer).resize({width:250}).png().toBuffer()
    .then(buffer=>{
        User.findById(data_id)
        .then(user=>{
            user.avatar = buffer
        
            user.save()
            .then(()=>{
                res.send('Met Yaw')
            })
        })
    })
})

// READ AVATAR
app.get('/users/:id/avatar', async (req, res) => {
    // get user, kirim foto
    const user = await User.findById(req.params.id)

    if(!user || !user.avatar){
        throw new Error('Foto / User tidak ada')
    }

    res.set('Content-Type', 'image/png')
    res.send(user.avatar) // default: ContentType : application/json
})

// READ
app.get('/users', (req,res) => {

    User.find().then(result=>{res.send(result)})
})

app.get('/users/:id', (req,res) => {
    const data_id = req.params.id

    User.findById(data_id)
    .then(result=>{
        if (!result) {
            throw new Error ('ID tidak di temukan')
        }
        res.send(result)
    }).catch((err)=>{
        res.send(err.message)
    })
})

// UPDATE
app.patch('/users/:id',upload.single('avatar'), (req,res) => {
    let arrayBody = Object.keys(req.body)
    // req.body {name, email, age, password}
    // arrayBody [name, email, age, password]
    arrayBody.forEach(key => {
        if(!req.body[key]){
            delete req.body[key]
        }
    })
    // req.body {name, email, age}
    // arrayBody [name, email, age]
    arrayBody = Object.keys(req.body)

    const data_id = req.params.id
    
    User.findById(data_id)
        .then(user => {
            // user : {_id, name, password, email, age}

            if(!user){
                return res.send("User tidak di temukan")
            }

            // update user
            // arrayBody [name, email, age]
            arrayBody.forEach(key => {
                user[key] = req.body[key]
            })

            sharp(req.file.buffer).resize({width: 250}).png().toBuffer()
            .then(buffer => {

                user.avatar = buffer

                user.save()
                    .then(() => {
                        res.send('Update Profile Berhasil')
                    })

            })
            

            
        })
})

// DELETE
app.delete('/users/:id', (req,res) => {
    const data_id = req.params.id

    User.findByIdAndDelete(data_id)
    .then(result=>{
        if (!result) {
            throw new Error ('ID tidak di temukan')
        }
        res.send(result)
    }).catch((err)=>{
        res.send(err.message)
    })
})

// CREATE ONE TASK
app.post('/tasks/:userid', (req, res) => {
    const data_desc = req.body.description
    const data_id = req.params.userid

    // Cari user berdasarkan id
    User.findById(data_id)
        .then(user => {
            // Jika user tidak ditemukan
            if(!user){
                res.send('Unable to create task')
            }

            // Membuat task {_id, desc, compl, owner}
            const task = new Task({
                description: data_desc,
                owner: data_id
            })

            // Masukkan id dari task yg sudah di buat ke array 'tasks' pada user
            user.tasks = user.tasks.concat(task._id)
            console.log(user.tasks);
            
            user.save()
                .then(() => {
                    task.save()
                        .then(() => {
                            res.send(task)
                        })
                })

        })
})

// READ TASK BY USER ID
app.get('/tasks/:userid', (req, res) => {

    // Mencari user berdasarkan Id
    User.findById(req.params.userid)
        .populate(
            {
                path: 'tasks',
                options: {
                    // sorting data secara descending berdasarkan field completed
                    // 1 = Ascending : false -> true
                    // -1 = Descending : true -> false
                    sort: {
                        completed: 1
                    }
                }
            }
        ).exec() // Mencari data ke tasks berdasarkan task id untuk kemudian di kirim sebagai respon
        .then(user => {
            // Jika user tidak ditemukan
            if(!user){
                res.send('Unable to read tasks')
            }

            // Kirim respon hanya untuk field (kolom) tasks
            res.send(user.tasks)

        })
})

// READ ALL TASK
app.get('/tasks/:taskid', (req, res) => {
    Task.findById(req.params.taskid).then(task=>{
        res.send(task)
    })
})

// UPDATE TASK BY USERID AND TASKID
app.patch('/tasks/:userid/:taskid', (req, res) => {
    const data_userid = req.params.userid
    const data_taskid = req.params.taskid
    // Menemukan user by id
    User.findById(data_userid)
        .then(user => {
            if(!user) {
                return res.send('User tidak ditemukan')
            }

            // Menemukan task by id
            Task.findOne({_id: data_taskid})
                .then(task => {
                    if(!task) {
                        return res.send('Task tidak ditemukan')
                    }
                    
                    // Ubah nilai false menjadi true
                    task.completed = !(task.completed)

                    task.save()
                        .then(()=>{
                            res.send('Selesai dikerjakan')
                        })
                })
        })

})


// DELETE TASK BY ID
app.delete('/tasks', (req, res) => {
    const data_taskid = req.body.taskid

    Task.findByIdAndDelete({_id: data_taskid})
        .then(result => {
            res.send(result)
        })
})

app.listen(port, () => {
    console.log('Berjalan di port ' + port)
})