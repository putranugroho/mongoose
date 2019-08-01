const mongoose = require('mongoose')
const validatar = require('validator')
const bcrypt = require('bcrypt')

const userSchema = new mongoose.Schema({
    name : {
        type: String,
        required: true,
        trim: true
    },
    email : {
        type : String,
        // required : true,
        trim: true,
        lowercase : true,
        required:true,
        unique:true,
        validate(value){
            var hasil = validatar.isEmail(value)
            var kosong = validatar.isEmpty(value)

            if (kosong) {
                throw new Error('Isi emailnya blog')
            } else if(!hasil){
                throw new Error('Yang email anda masukan bukan')
            }
        }
    },
    password : {
        type : String,
        required : true,
        trim : true,
        minlength : 7,
        validate(value){
            var hasil = validatar.contains(value,'password')

            if (hasil) {
                throw new Error('Passwordnya kok password blog')
            }
        }
    },
    age : {
        type : Number,
        min: 0,
        default: 0,
        validate(value){
            // var kosong = parseInt(value)

            if (value == null) {
                throw new Error ('umur ga boleh kosong, kalo kosong udah mokat')
            }
        }
    },
    avatar: {
        type: Buffer
    },
    tasks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
    }]
})

// Model Method
userSchema.statics.loginWithEmail = async (da_email, da_password) => {

    const user = await User.findOne({email: da_email})
    
    if(!user){ // user tidak di temukan
        throw new Error('User not found')
    }

    // da_password: satuduatiga
    // user.password: $2b$08$efjBzkL
    // match: true or false
    const match = await bcrypt.compare(da_password, user.password)

    if(!match){
        throw new Error('Wrong password')
    }

    return user
    /*
    {
        email: alvin@gmail.com,
        password: 2$sdTy^7gdsesd
    }
    email: alvin@gmail.com
    password: satuduatiga
    */
}

// Membuat function yang akan dijalankan sebelom user .save()
userSchema.pre('save', async function(next){
    const user = this

    if(user.isModified('password')){ // true saat pertama dibuat dan mengalami perubahan
        var hasil = await bcrypt.hash(user.password, 8)
        user.password = hasil // karakter hasil hash
    }

    next() // lanjut ke proses save()

})

const User = mongoose.model('user', userSchema)

module.exports = User










