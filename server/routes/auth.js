const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const TN_COORDS = {
  Chennai:         [13.0827, 80.2707],
  Coimbatore:      [11.0168, 76.9558],
  Madurai:         [9.9252,  78.1198],
  Tiruchirappalli: [10.7905, 78.7047],
  Salem:           [11.6643, 78.1460],
  Tirunelveli:     [8.7139,  77.7567],
  Vellore:         [12.9165, 79.1325],
  Erode:           [11.3410, 77.7172],
  Thoothukudi:     [8.7642,  78.1348],
  Thanjavur:       [10.7870, 79.1378],
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, location } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already exists' });

    const city = location?.city || 'Chennai';
    const [lat, lng] = TN_COORDS[city] || TN_COORDS['Chennai'];

    const user = await User.create({
      name, email, password,
      phone: phone || '',
      role: 'worker',
      location: { city, lat, lng },
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    res.json({
      token: generateToken(user._id),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
