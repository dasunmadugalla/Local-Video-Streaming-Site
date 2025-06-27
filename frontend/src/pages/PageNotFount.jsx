import React from 'react'
import pageNotFoundImg from '../assets/not_found.png'
import '../styling/PageNotFound.css'

function PageNotFount() {
  return (
    <div className='mainContainer'>
      <img src={pageNotFoundImg} alt="Page Not Found" className='notfoundImg' />
    </div>
  )
}

export default PageNotFount
