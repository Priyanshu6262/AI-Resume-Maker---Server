const express = require('express');
const Resume = require('../models/Resume');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Middleware to protect routes
const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Create or Update Resume
router.post('/', protect, async (req, res) => {
    const { _id, templateId, personalInfo, education, experience, skills, projects } = req.body;

    try {
        let resume = null;
        if (_id) {
            resume = await Resume.findOne({ _id, userId: req.user.id });
        }

        if (resume) {
            // Update existing
            resume.templateId = templateId;
            resume.personalInfo = personalInfo;
            resume.education = education;
            resume.experience = experience;
            resume.skills = skills;
            resume.projects = projects;
        } else {
            // Create new
            resume = new Resume({
                userId: req.user.id,
                templateId,
                personalInfo,
                education,
                experience,
                skills,
                projects,
            });
        }

        const savedResume = await resume.save();
        res.json(savedResume);
    } catch (error) {
        console.error("Save Resume Error:", error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get ALL User Resumes
router.get('/', protect, async (req, res) => {
    try {
        const resumes = await Resume.find({ userId: req.user.id }).sort({ updatedAt: -1 });
        res.json(resumes);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get specific Resume
router.get('/:id', protect, async (req, res) => {
    try {
        const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id });
        if (resume) {
            res.json(resume);
        } else {
            res.status(404).json({ message: 'Resume not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete Resume
router.delete('/:id', protect, async (req, res) => {
    try {
        const resume = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (resume) {
            res.json({ message: 'Resume deleted successfully' });
        } else {
            res.status(404).json({ message: 'Resume not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
