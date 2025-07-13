import { useState } from 'react'
import logoImage from '../assets/logo-vocali.png'
import logoVideo from '../assets/logo-vocali-animated.mp4'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  className?: string
}

const Logo: React.FC<LogoProps> = ({ size = 'md', animated = false, className = '' }) => {
  const [isHovered, setIsHovered] = useState(false)

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  }

  if (animated && isHovered) {
    return (
      <div 
        className={`${sizeClasses[size]} ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <video
          autoPlay
          muted
          loop
          className="w-full h-full object-contain"
          onEnded={() => setIsHovered(false)}
        >
          <source src={logoVideo} type="video/mp4" />
          <img src={logoImage} alt="Vocali" className="w-full h-full object-contain" />
        </video>
      </div>
    )
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img 
        src={logoImage} 
        alt="Vocali" 
        className="w-full h-full object-contain"
      />
    </div>
  )
}

export default Logo 