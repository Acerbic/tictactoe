import { AppProps } from "next/app";
import { RecoilRoot } from "recoil";

// Tailwind CSS + custom components
import "../components/tailwind/index.css";

function MyApp({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <Component {...pageProps} />
        </RecoilRoot>
    );
}

export default MyApp;
