import React from "react";
import Footer from "components/Footer/Footer";
import SEO from "components/Common/SEO";
import { t } from "@lingui/macro";
import { getPageTitle } from "lib/legacy";
import "./TermsAndConditions.css";

export default function TermsAndConditions() {
  return (
    <SEO title={getPageTitle(t`Terms and Conditions`)}>
      <div className="default-container Page page-layout">
        <div>
          <div className="Page-title-section center">
            <div className="Page-title">UTX</div>
            <div className="Page-subtitle">Terms and Conditions</div>
            <div className="Page-description">Last modified: August 1st, 2022</div>
          </div>
        </div>
      </div>
    </SEO>
  );
}
