import React from 'react'
import "./HomeStyles.css"
import { NavLink } from 'react-router-dom'
import FAQ from '../About/FAQ/FAQ'

const Home = () => {

  return (
    <>
      <div className='Tagline'>

        <h1>Exploring the boundless possibilities of technology.</h1>
        <h2>Where imagination meets creativity</h2>

      </div >
      <img className="Landing-image" src="../../src/assets/Images/shahadat-rahman-BfrQnKBulYQ-unsplash.jpg" alt="image" />
      <p>Want to learn and grow together computer Enthusiast?<br></br>
        Then join us and enroll in our courses
      </p>
      <div className='getstarted'>
        <NavLink to="/courses"><button className='btn-getstarted' type="submit">Get Started</button></NavLink>
      </div>
      <FAQ />
    </>

  )
}

export default Home
