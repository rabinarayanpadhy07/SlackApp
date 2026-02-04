import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Password is required']
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      minlength: [3, 'Username must be at least 3 characters'],
      match: [
        /^[a-zA-Z0-9]+$/,
        'Username must contain only letters and numbers'
      ]
    },
    avatar: {
      type: String
    }
  },
  { timestamps: true }
);

// ✅ SAFE pre-save hook (NO next, NO sync code)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(9);
  this.password = await bcrypt.hash(this.password, salt);
  this.avatar = `https://robohash.org/${this.username}`;
});

const User = mongoose.model('User', userSchema);

export default User;
