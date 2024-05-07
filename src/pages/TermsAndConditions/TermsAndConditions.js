import React from "react";
import Footer from "components/Footer/Footer";
import SEO from "components/Common/SEO";
import { t } from "@lingui/macro";
import { getPageTitle } from "lib/legacy";
import "./TermsAndConditions.css";

export default function TermsAndConditions() {
  return <SEO title={getPageTitle(t`Terms and Conditions`)}></SEO>;
}
