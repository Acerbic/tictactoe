import React from "react";
import { AppProps } from "next/app";
import { RecoilRoot } from "recoil";

import { usePlayerAuthInitialize } from "../state-defs/playerAuth";

// Tailwind CSS + custom components
import "../components/tailwind/index.css";

/**
 * Component to initialize Recoil-dependent state
 */
const RecoilDependent: React.FC = ({ children }) => {
    // initiating stored playerAuth session from Local Storage
    usePlayerAuthInitialize();
    return <>{children}</>;
};

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <RecoilDependent>
                <Component {...pageProps} />
            </RecoilDependent>
        </RecoilRoot>
    );
}

export default MyApp;
