import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
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
      required: [true, 'Password is required']
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
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function saveUser() {
  // NOTE: In recent mongoose versions, `save()` passes an options object into
  // pre('save') middleware. Using callback-style middleware here can lead to
  // "next is not a function" if the first argument is actually `options`.
  //
  // Promise-based middleware avoids that whole class of issues.
  const user = this;

  // Only hash when password is newly set/changed (avoid double-hashing on updates)
  if (user.isModified('password')) {
    const salt = await bcrypt.genSalt(9);
    user.password = await bcrypt.hash(user.password, salt);
  }

  // Set avatar on create or when username changes
  if (user.isNew || user.isModified('username') || !user.avatar) {
    user.avatar = `https://robohash.org/${user.username}`;
  }
});

const User = mongoose.model('User', userSchema);

export default User;