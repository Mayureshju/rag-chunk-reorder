import { useState } from 'react';
import { GlobalStyles } from './styles/GlobalStyles';
import { Navbar } from './components/Navbar';
import { AnnouncementBar } from './components/AnnouncementBar';
import { Hero } from './components/Hero';
import { StickyInstall } from './components/StickyInstall';
import { Problem } from './components/Problem';
import { Solution } from './components/Solution';
import { InteractiveDemo } from './components/InteractiveDemo';
import { DemoClip } from './components/DemoClip';
import { Strategies } from './components/Strategies';
import { Recipes } from './components/Recipes';
import { Features } from './components/Features';
import { Pipeline } from './components/Pipeline';
import { Benchmarks } from './components/Benchmarks';
import { SocialProof } from './components/SocialProof';
import { UsedBy } from './components/UsedBy';
import { DropInRecipes } from './components/DropInRecipes';
import { ApiReference } from './components/ApiReference';
import { Installation } from './components/Installation';
import { Footer } from './components/Footer';

export default function App() {
  const [activeSection, setActiveSection] = useState('hero');

  return (
    <>
      <GlobalStyles />
      <AnnouncementBar />
      <StickyInstall />
      <Navbar active={activeSection} onNavigate={setActiveSection} />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <InteractiveDemo />
        <DemoClip />
        <Strategies />
        <Recipes />
        <Pipeline />
        <Features />
        <DropInRecipes />
        <UsedBy />
        <Benchmarks />
        <SocialProof />
        <Installation />
        <ApiReference />
        <Footer />
      </main>
    </>
  );
}
