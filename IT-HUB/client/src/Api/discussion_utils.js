import axios from "axios";
import { redirect } from "react-router-dom";

export const getQuestion = async () => {
  const question = await axios.get("http://localhost:5000/api/question");
  question.data.reverse();
  return question.data;
};

export const deleteQuestion = async ({ params }) => {
  const res = await axios.delete(`http://localhost:5000/api/question/${params.id}`);
  console.log(res.status);
  if (!res.status === 200) throw new Error("Error occured while deleting");
  return redirect("/question");
};

export const postQuestion = async ({ request }) => {
  const formData = await request.formData();
  const post = {
    question: formData.get("question"),
  };

  const res = await axios.post("http://localhost:5000/api/question", post);

  if (!res.status === 200) throw Error("cannot post data");

  return redirect("/question");
};

export const getAnswer = async ({ params }) => {
  const { id } = params;
  const response = await axios.get(`http://localhost:5000/api/${id}/comment`);
  if (response.status != 200) throw new Response("Not Found", { status: 404 });

  return response.data;
};
