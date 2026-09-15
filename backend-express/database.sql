--
-- PostgreSQL database dump
--

\restrict RbikxdK0CgM9ruyGlW2JFi8ODuhFVDyx3rsWpO62QXUIfqApEaCEmcnlJIUZZ8v

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-09-14 18:17:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 225 (class 1259 OID 17337)
-- Name: actuator_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.actuator_logs (
    id uuid NOT NULL,
    box_id uuid,
    type character varying(50),
    status boolean,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.actuator_logs OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17314)
-- Name: automation_thresholds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_thresholds (
    id uuid NOT NULL,
    tenant_id uuid,
    floor_level integer,
    temp_min numeric(5,2),
    temp_max numeric(5,2),
    air_hum_min numeric(5,2),
    air_hum_max numeric(5,2),
    media_hum_min numeric(5,2),
    media_hum_max numeric(5,2)
);


ALTER TABLE public.automation_thresholds OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17302)
-- Name: box_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.box_locations (
    id uuid NOT NULL,
    box_id uuid,
    floor_level integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.box_locations OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17288)
-- Name: boxes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boxes (
    id uuid NOT NULL,
    tenant_id uuid,
    name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.boxes OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17349)
-- Name: cv_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cv_results (
    id uuid NOT NULL,
    box_id uuid,
    image_url character varying(255),
    dominant_phase character varying(100),
    confidence_score numeric(5,2),
    detection_counts jsonb,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.cv_results OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17363)
-- Name: harvest_predictions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.harvest_predictions (
    id uuid NOT NULL,
    box_id uuid,
    estimated_days integer,
    urgency_level character varying(50),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.harvest_predictions OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17375)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    tenant_id uuid,
    message text,
    is_read boolean DEFAULT false,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17325)
-- Name: sensor_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor_data (
    id uuid NOT NULL,
    box_id uuid,
    air_temp numeric(5,2),
    air_humidity numeric(5,2),
    media_humidity numeric(5,2),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sensor_data OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17255)
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    tenant_code character varying(100),
    contact_person character varying(255),
    phone character varying(50),
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 17268)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    tenant_id uuid,
    username character varying(255),
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 4921 (class 2606 OID 17343)
-- Name: actuator_logs actuator_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actuator_logs
    ADD CONSTRAINT actuator_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 17319)
-- Name: automation_thresholds automation_thresholds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_thresholds
    ADD CONSTRAINT automation_thresholds_pkey PRIMARY KEY (id);


--
-- TOC entry 4915 (class 2606 OID 17308)
-- Name: box_locations box_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.box_locations
    ADD CONSTRAINT box_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 4913 (class 2606 OID 17296)
-- Name: boxes boxes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boxes
    ADD CONSTRAINT boxes_pkey PRIMARY KEY (id);


--
-- TOC entry 4923 (class 2606 OID 17357)
-- Name: cv_results cv_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv_results
    ADD CONSTRAINT cv_results_pkey PRIMARY KEY (id);


--
-- TOC entry 4925 (class 2606 OID 17369)
-- Name: harvest_predictions harvest_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_predictions
    ADD CONSTRAINT harvest_predictions_pkey PRIMARY KEY (id);


--
-- TOC entry 4927 (class 2606 OID 17384)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 17331)
-- Name: sensor_data sensor_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_data
    ADD CONSTRAINT sensor_data_pkey PRIMARY KEY (id);


--
-- TOC entry 4905 (class 2606 OID 17265)
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- TOC entry 4907 (class 2606 OID 17267)
-- Name: tenants tenants_tenant_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_tenant_code_key UNIQUE (tenant_code);


--
-- TOC entry 4909 (class 2606 OID 17282)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4911 (class 2606 OID 17280)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4933 (class 2606 OID 17344)
-- Name: actuator_logs actuator_logs_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.actuator_logs
    ADD CONSTRAINT actuator_logs_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 17320)
-- Name: automation_thresholds automation_thresholds_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_thresholds
    ADD CONSTRAINT automation_thresholds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4930 (class 2606 OID 17309)
-- Name: box_locations box_locations_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.box_locations
    ADD CONSTRAINT box_locations_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON DELETE CASCADE;


--
-- TOC entry 4929 (class 2606 OID 17297)
-- Name: boxes boxes_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boxes
    ADD CONSTRAINT boxes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4934 (class 2606 OID 17358)
-- Name: cv_results cv_results_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cv_results
    ADD CONSTRAINT cv_results_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON DELETE CASCADE;


--
-- TOC entry 4935 (class 2606 OID 17370)
-- Name: harvest_predictions harvest_predictions_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_predictions
    ADD CONSTRAINT harvest_predictions_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON DELETE CASCADE;


--
-- TOC entry 4936 (class 2606 OID 17385)
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- TOC entry 4932 (class 2606 OID 17332)
-- Name: sensor_data sensor_data_box_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor_data
    ADD CONSTRAINT sensor_data_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON DELETE CASCADE;


--
-- TOC entry 4928 (class 2606 OID 17283)
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


-- Completed on 2026-09-14 18:17:18

--
-- PostgreSQL database dump complete
--

\unrestrict RbikxdK0CgM9ruyGlW2JFi8ODuhFVDyx3rsWpO62QXUIfqApEaCEmcnlJIUZZ8v
