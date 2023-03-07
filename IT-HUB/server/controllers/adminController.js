const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Question = require("../models/questionModel");
const Comment = require("../models/commentModel");
const Report = require("../models/reportModel");
const Gallery = require("../models/galleryModel");
const { Poll, Candidate } = require("../models/pollModel");
const { sendEmail } = require("../utils/sendEmail");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

//* Admin can view all the users of the site!
///////////////////////////////////////////////////////////
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.status(200).json(users);
});

//* Admin can delete the account of user
//? but why?
//todo: deleting user also should delete the post and reports and upvotes done by the user lol
//////////////////////////////////////////////////////////
const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const deletedUser = await User.findByIdAndDelete(userId);
  if (!deletedUser) {
    res.status(404);
    throw new Error(`no user with id: ${userId}`);
  }
  res.status(200).json(deletedUser);
});

//* Admin can view the reported posts
///////////////////////////////////////////////////////////////
const getReportedPosts = asyncHandler(async (req, res) => {
  const reportedPosts = await Report.find()
    .populate("reportedOn")
    .sort({ count: -1 });
  res.status(200).json(reportedPosts);
});

//* Admin can delete the reported post
//////////////////////////////////////////////////////////////
const deleteReportedPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  try {
    const post = await findPostById(postId);
    console.log(post);
    if (!post) {
      return res
        .status(404)
        .json({ msg: `No post with id: ${postId} has been reported.` });
    }

    await deletePost(post);

    const message = generateEmailMessage(post);
    const subject = generateEmailSubject(post);

    await sendEmailToPostAuthor(post, message, subject);

    res.status(200).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

const findPostById = asyncHandler(async (postId) => {
  let post;
  if (await Comment.findById(postId)) {
    post = await Comment.findById(postId).populate("commenter", "name email");
  }
  if (await Question.findById(postId)) {
    post = await Question.findById(postId).populate("questioner", "name email");
  }

  if (!post?.isReported) {
    return null;
  }

  return post;
});

const deletePost = async (post) => {
  if (post instanceof Comment) {
    const deleted = await Comment.findByIdAndDelete(post._id);
    await User.findByIdAndUpdate(deleted.commenter, {
      $inc: { contribution: -4 },
    });
  } else if (post instanceof Question) {
    await Question.findByIdAndDelete(post._id);
    await Comment.deleteMany({ _id: post.comments });
  }
};

const generateEmailMessage = (post) => {
  const reportedContent = post.answer || post.question;
  const authorName = post.commenter?.name || post.questioner?.name;

  return `
    <h2>Hello ${authorName},</h2>
    <p>Reports on your post were reviewed by the admin and found to be valid.</p>
    <p>So your post has been removed by the admin.</p>
    <p>Please don't post unnecessary content or else your account will be deleted then you can't take part in events organized by the club and you as well receive more punishment from the college as well.</p>
    <p>Be more careful</p>
    <p>Reported Content:</p>
    <p>${reportedContent}</p>
    <p>Regards...</p>
    <p>IT-Hub</p>
  `;
};

const generateEmailSubject = (post) => {
  const reportedType = post instanceof Comment ? "Comment" : "Question";
  return `${reportedType} Removed By Admin`;
};

const sendEmailToPostAuthor = async (post, message, subject) => {
  const authorEmail = post.commenter?.email || post.questioner?.email;
  const sentFrom = process.env.EMAIL_USER;

  await sendEmail(subject, message, authorEmail, sentFrom);
};

//* Admin creates the poll
/////////////////////////////////////////////////////////
const createPoll = asyncHandler(async (req, res) => {
  const { restriction, description, topic, expireTime } = req.body;
  let startTime = req.body.startTime;
  if (startTime === undefined || startTime < 0) {
    startTime = 0;
  }
  if (!topic || !expireTime || !description || expireTime <= 0.5) {
    res.status(400);
    throw new Error(
      "topic, description and expire time should be mentioned and expireTime>0.5"
    );
  }

  const createdAt = new Date(new Date().getTime() + startTime * 60 * 60 * 1000);
  const expiresAt = new Date(createdAt.getTime() + expireTime * 60 * 60 * 1000);
  const poll = await Poll.create({
    topic,
    restriction,
    description,
    createdAt,
    expiresAt,
  });

  res.status(200).json({ msg: "Poll created succesfully" });
});

//* admin updates the poll from initial to final
////////////////////////////////////////////////////////////
const updateForVoting = asyncHandler(async (req, res) => {
  const { pollId } = req.params;
  const poll = await Poll.findById(pollId);
  if (!poll) {
    res.status(404);
    throw new Error(`no poll with id: ${pollId}`);
  }
  const currentDate = new Date();
  if (poll.expiresAt < currentDate && poll.startsAt > currentDate) {
    res.status(400);
    throw new Error("cannot modify this poll,regestration is going on!!");
  }
  const { topic, description, restriction, expireTime } = req.body;
  let startTime = req.body.startTime;
  if (startTime === undefined || startTime < 0) {
    startTime = 0;
  }
  if (!topic || !expireTime || expireTime < 0.5) {
    res.status(400);
    throw new Error("topic expire time and start time field cannot be empty");
  }
  console.log(startTime);
  let startAt = new Date(new Date().getTime() + startTime * 60 * 60 * 1000);
  poll.topic = topic;
  poll.phase = "final";
  poll.restriction = restriction;
  poll.description = description;
  poll.startsAt = startAt;
  poll.expiresAt = new Date(startAt.getTime() + expireTime * 60 * 60 * 1000);
  await poll.save();
  res.status(200).json(poll);
});

//* admin can view every poll
///////////////////////////////////////////////////////////////
const getAllPoll = asyncHandler(async (req, res) => {
  const polls = await Poll.find();
  res.status(200).json(polls);
});

//* admin can view poll of initial phase
//////////////////////////////////////////////////////////////
const getPollInitial = asyncHandler(async (req, res) => {
  const polls = await Poll.find({ phase: "Initial" });
  res.status(200).json(polls);
});

//* admin can view poll that is ready to be updated
/////////////////////////////////////////////////////////////
const getUpdateablePoll = asyncHandler(async (req, res) => {
  const polls = await Poll.find({
    expiresAt: { $lt: new Date() },
    phase: "Initial",
  });
  res.status(200).json(polls);
});

//* admin can view poll of final phase
///////////////////////////////////////////////////////////////
const getPollFinal = asyncHandler(async (req, res) => {
  const polls = await Poll.find({ phase: "Final" });
  res.status(200).json(polls);
});

//* admin can view poll which are completed!
//////////////////////////////////////////////////////////////
const getPollCompleted = asyncHandler(async (req, res) => {
  const polls = await Poll.find({ isCompleted: true });
  res.status(200).json(polls);
});

//* admin uploads the image
/////////////////////////////////////////////////////////////
const uploadImages = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    res.status(400);
    throw new Error("title and description cannot be empty");
  }
  if (req.files.length === 0) {
    res.status(400);
    throw new Error("no file is uploaded");
  }

  imageData = [{}];
  for (i = 0; i < req.files.length; i++) {
    uploadedFile = await cloudinary.uploader.upload(req.files[i].path, {
      folder: `IT-Hub/Gallery/${title}`,
      resource_type: "image",
    });
    imageData[i] = {
      imageId: uploadedFile.public_id,
      imageName: req.files[i].originalname,
      imagePath: uploadedFile.secure_url,
    };
    fs.unlink(req.files[i].path, (err) => {
      if (err) console.log("error while deleting image");
    });
  }
  const images = await Gallery.create({
    title,
    description,
    images: imageData,
  });

  res.status(200).json(images);
});

module.exports = {
  createPoll,
  updateForVoting,
  getAllPoll,
  getPollInitial,
  getPollFinal,
  getUpdateablePoll,
  getPollCompleted,
  getAllUsers,
  deleteUser,
  getReportedPosts,
  deleteReportedPost,
  uploadImages,
};
