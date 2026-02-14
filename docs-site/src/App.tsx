import { useState } from 'react';
import { GlobalStyles } from './styles/GlobalStyles';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { InteractiveDemo } from './components/InteractiveDemo';
import { Strategies } from './components/Strategies';
import { Features } from './components/Features';
import { Pipeline } from './components/Pipeline';
import { ApiReference } from './components/ApiReference';
import { Installation } from './components/Installation';
import { Footer } from './components/Footer';

export default function App() {
  const [activeSection, setActiveSection] = useState('hero');

  return (
    <>
      <GlobalStyles />
      <Navbar active={activeSection} onNavigate={setActiveSection} />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <InteractiveDemo />
        <Strategies />
        <Pipeline />
        <Features />
        <Installation />
        <ApiReference />
        <Footer />
      </main>
    </>
  );
}
