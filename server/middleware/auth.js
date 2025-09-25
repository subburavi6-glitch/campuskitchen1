import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    try {
      const fullUser = await req.prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true
        }
      });

      if (fullUser) {
        if (fullUser.status !== 'ACTIVE') {
          return res.status(403).json({ error: 'User inactive' });
        }
        req.user = fullUser;
      } else {
        // Check if it's a mobile student token
        const student = await req.prisma.student.findUnique({
          where: { id: user.studentId },
          select: {
            id: true,
            name: true,
            registerNumber: true
          }
        });

        if (!student) {
          return res.status(403).json({ error: 'User not found' });
        }

        req.user = { ...student, studentId: student.id };
      }

      next();
    } catch (error) {
      console.log(error)
      return res.status(500).json({ error: user });
    }
  });
};
export const authenticateToken1 = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    try {
     
        // Check if it's a mobile student token
        const student = await req.prisma.student.findUnique({
          where: { id: user.studentId },
          select: {
            id: true,
            name: true,
            registerNumber: true
          }
        });

        if (!student) {
          return res.status(403).json({ error: 'User not found' });
        }

        req.user = { ...student, studentId: student.id };
      

      next();
    } catch (error) {
      console.log(error)
      return res.status(500).json({ error: user });
    }
  });
};
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};