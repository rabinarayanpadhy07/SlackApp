import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: [true, 'Email already exists'],
      match: [
        // eslint-disable-next-line no-useless-escape
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address'
      ]
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: [true, 'Username already exists'],
      minLength: [3, 'Username must be at least 3 characters'],
      match: [
        /^[a-zA-Z0-9]+$/,
        'Username must contain only letters and numbers'
      ]
    },
    avatar: {
      type: String
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationToken: {
      type: String
    },
    verificationTokenExpiry: {
      type: Date
    },
    twoFactorSecret: {
      type: String
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false
    },
    plan: {
      type: String,
      enum: ['Normal', 'Paid'],
      default: 'Normal'
    },
    isSuperAdmin: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    suspendedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

userSchema.index({ username: 'text' });

userSchema.pre('save', async function saveUser() {
  if (!this.isNew) {
    return;
  }

  const user = this;
  if (user.password) {
    const SALT = bcrypt.genSaltSync(9);
    const hashedPassword = bcrypt.hashSync(user.password, SALT);
    user.password = hashedPassword;
  }
  if (!user.avatar) {
    user.avatar = `https://robohash.org/${user.username}`;
  }
  user.verificationToken = uuidv4().substring(0, 10).toUpperCase();
  user.verificationTokenExpiry = Date.now() + 3600000; // 1 hour
});

const User = mongoose.model('User', userSchema);

export default User;
