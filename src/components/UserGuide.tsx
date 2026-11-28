import { useEffect, useRef, type MouseEvent } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import { asvsChapters } from "../data/asvsData";
import { guideChapterDescriptions, guideTopics } from "../data/userGuide";
import { useLanguage } from "../context/LanguageContext";

export function UserGuide() {
  const { language, t } = useLanguage();
  const { activeAnalysisId } = useOutletContext<{ activeAnalysisId: string | null }>();
  const location = useLocation();
  const topicId = new URLSearchParams(location.search).get("topic");
  const detailsRefs = useRef<Record<string, HTMLDetailsElement | null>>({});

  const openTopic = (id: string) => {
    const details = detailsRefs.current[id];
    if (!details) return;
    details.open = true;
    details.querySelector("summary")?.focus({ preventScroll: true });
    details.scrollIntoView({ block: "start" });
  };

  useEffect(() => {
    if (topicId) openTopic(topicId);
  }, [topicId]);

  const topicUrl = (id: string) => {
    const params = new URLSearchParams({ topic: id });
    if (activeAnalysisId) params.set("analysis", activeAnalysisId);
    return `/guide?${params.toString()}`;
  };

  const handleTopicClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) openTopic(id);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <BookOpen className="shrink-0 text-blue-700" size={24} aria-hidden="true" />
            <h1 className="text-2xl font-bold text-slate-900">{t("Príručka používateľa", "User guide")}</h1>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {t("Praktický sprievodca od prvého projektu po report. Otvorte kapitolu alebo použite odkazy medzi témami; príručka je dostupná aj bez otvoreného projektu.", "A practical guide from your first project to a report. Expand a topic or follow the links between topics; the guide is also available without an open project.")}
          </p>
        </header>

        <nav aria-label={t("Obsah príručky", "Guide contents")} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-slate-900">{t("Obsah", "Contents")}</h2>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {guideTopics.map(topic => (
              <li key={topic.id}>
                <Link to={topicUrl(topic.id)} onClick={event => handleTopicClick(event, topic.id)} className="text-sm font-medium text-blue-700 underline decoration-blue-200 underline-offset-2 hover:text-blue-900">
                  {topic.title[language]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          {guideTopics.map(topic => (
            <details key={topic.id} ref={element => { detailsRefs.current[topic.id] = element; }} className="group scroll-mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-5 text-left text-base font-bold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span>{topic.title[language]}</span>
                <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-6 text-slate-700">
                <p>{topic.intro[language]}</p>
                {topic.steps.length > 0 && (
                  <ul className="list-disc space-y-2 pl-5">
                    {topic.steps.map((step, index) => <li key={index}>{step[language]}</li>)}
                  </ul>
                )}
                {topic.id === "chapters" && (
                  <ul className="space-y-3">
                    {asvsChapters.map(chapter => (
                      <li key={chapter.id}>
                        <strong>V{chapter.id}: {chapter.name}</strong>
                        {" — "}{guideChapterDescriptions[chapter.id][language]}
                      </li>
                    ))}
                  </ul>
                )}
                {activeAnalysisId && topic.route && (
                  <p>
                    <Link to={`/analysis/${encodeURIComponent(activeAnalysisId)}/${topic.route}`} className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">
                      {t("Otvoriť sekciu v aktuálnom projekte", "Open this section in the current project")}
                    </Link>
                  </p>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{t("Súvisiace témy", "Related topics")}</p>
                  <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    {topic.related.map(id => {
                      const related = guideTopics.find(item => item.id === id);
                      if (!related) return null;
                      return <li key={id}><Link to={topicUrl(id)} onClick={event => handleTopicClick(event, id)} className="text-blue-700 underline underline-offset-2 hover:text-blue-900">{related.title[language]}</Link></li>;
                    })}
                  </ul>
                </div>
              </div>
            </details>
          ))}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          <h2 className="font-bold text-slate-900">{t("Ďalšie zdroje", "Further reading")}</h2>
          <ul className="mt-2 space-y-2">
            <li><a href="https://owasp.org/www-project-application-security-verification-standard/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2">OWASP ASVS <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">{t(" (otvorí sa v novom okne)", " (opens in a new window)")}</span></a></li>
            <li><a href="https://owasp.org/www-community/Threat_Modeling" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2">OWASP Threat Modeling <ExternalLink size={14} aria-hidden="true" /><span className="sr-only">{t(" (otvorí sa v novom okne)", " (opens in a new window)")}</span></a></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
