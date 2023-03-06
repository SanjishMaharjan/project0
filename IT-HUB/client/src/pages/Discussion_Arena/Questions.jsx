import {
  useNavigate,
  useFetcher,
  Link,
  useLoaderData,
  Form,
  useNavigation,
  useParams,
} from "react-router-dom";
import { getDate } from "../../Utils/dateConverter";
import { BiUpvote, BiDownvote, BiComment } from "react-icons/bi";
import { HiFlag } from "react-icons/hi";
import { FaTrash } from "react-icons/fa";
import Loader from "../../components/Loader";
import useAuth from "../../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { CgMoreO } from "react-icons/cg";
import "./question.scss";

import Pagination from "../../components/Pagination";

const Questions = () => {
  const { isLoggedIn, user } = useAuth();
  const { id } = useParams();
  const { data: questions } = useQuery(["question", id], { enabled: false });
  const fetcher = useFetcher();

  if (useNavigation().state === "loading" && fetcher.formData == null) return <Loader />;

  return (
    <>
      <div className="question-wrapper">
        <div class="question-container">
          {questions.map((question) => (
            <Link to={`/question/${question._id}`} key={question._id}>
              <div className="question">
                <div className="div">
                  <Link to={`/profile/${question.questioner._id}`}>
                    <img src={question.questioner.image.imagePath} height="50" width="50" alt="" />
                  </Link>
                </div>
                <div className="question-content">
                  <h1>{question.questioner.name}</h1>
                  <p>Last engaged {getDate(question.updatedAt) || 1 + "second"} ago</p>
                  <br />
                  <p>{question.question}</p>
                </div>

                <div className="reply">
                  <div className="reply-images">
                    <img src="../../src/assets/Images/image.jpg" height="20" width="20" alt="" />
                    <img src="../../src/assets/Images/image.jpg" height="20" width="20" alt="" />
                    <img src="../../src/assets/Images/image.jpg" height="20" width="20" alt="" />
                    <CgMoreO color="green" fontSize="1.3rem" />
                  </div>
                  <p>25 comments</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="aside">
          <Link to="/question/new">
            <button>Start Discussion</button>
          </Link>
          <Link to="#">
            <a>My discussion</a>
          </Link>

          <hr />

          <div className="tags">
            <a className="tag">#javascript</a>
            <a className="tag">#python</a>
            <a className="tag">#java</a>
            <a className="tag">#react</a>
          </div>
        </div>
      </div>
      <Pagination currentPage={Number(id)} totalPages={10} baseUrl={`/question/page`} />
    </>
  );
};

export default Questions;
