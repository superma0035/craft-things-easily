
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF5733] to-[#FF7F50]">
      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="text-center text-white max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <span className="text-4xl font-bold text-white">Z</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-bold mb-4 drop-shadow-lg">ZapDine</h1>
          </div>

          {/* Tagline */}
          <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
            Streamline your restaurant's dining experience with QR-powered ordering
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate('/auth')}
              className="bg-white text-[#FF5733] hover:bg-gray-100 text-lg px-8 py-6 rounded-xl font-semibold min-w-[200px] shadow-lg transition-all duration-200 hover:scale-105"
            >
              Get Started
            </Button>
            <Button
              onClick={() => {
                const howItWorksSection = document.getElementById('how-it-works');
                if (howItWorksSection) {
                  howItWorksSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-[#FF5733] text-lg px-8 py-6 rounded-xl font-semibold min-w-[200px] bg-transparent backdrop-blur-sm transition-all duration-200 hover:scale-105"
            >
              How It Works
            </Button>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-20 fill-gray-50">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25"></path>
            <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5"></path>
            <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"></path>
          </svg>
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="bg-gray-50 py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            How ZapDine Works
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-3xl mx-auto">
            Modern dining made simple for restaurants and customers
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-[#FF5733] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Setup Your Restaurant</h3>
              <p className="text-gray-600">Create your profile, upload your menu, and generate QR codes for your tables.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-[#FF5733] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Customers Scan & Order</h3>
              <p className="text-gray-600">Diners scan the QR code, browse your menu, and place orders directly from their phones.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-200">
              <div className="w-16 h-16 bg-[#FF5733] rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-white font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Manage & Fulfill</h3>
              <p className="text-gray-600">Receive orders in real-time, track preparation, and deliver exceptional dining experiences.</p>
            </div>
          </div>

          <div className="mt-16">
            <Button
              onClick={() => navigate('/auth')}
              className="bg-[#FF5733] text-white hover:bg-[#E6492E] text-lg px-8 py-6 rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105"
            >
              Start Your Restaurant Journey
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-[#FF5733] rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-white">Z</span>
            </div>
            <h3 className="text-xl font-bold">ZapDine</h3>
          </div>
          <p className="text-gray-400 mb-4">Revolutionizing restaurant dining experiences</p>
          <p className="text-gray-500">
            Powered by <span className="font-semibold text-[#FF5733]">SPS Labs</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
