/*!
 * MLE.Client.Components.Views.Admin
 * File: admin.view.js
 * Copyright(c) 2024 Runtime Software Development Inc.
 * Version 2.0
 * MIT Licensed
 */

import { useEffect, useState, memo, useRef } from 'react';
import { UserMessage } from "../common/message";
import { useUser } from "../../providers/user.provider.client";
import { useRouter } from "../../providers/router.provider.client";
import { useDialog } from "../../providers/dialog.provider.client";
import Accordion from '../common/accordion';
import Table from '../common/table';
import Button from '../common/button';
import Loading from '../common/loading';
import Badge from '../common/badge';

/**
 * Render admin panel component (super-administrator users).
 *
 * @public
 * @returns {JSX.Element} result
 */
const AdminView = () => {
    const user = useUser();
    const router = useRouter();
    const dialog = useDialog();

    const [message, setMessage] = useState(null);
    const [pendingJobs, setPendingJobs] = useState([]);
    const [jobCounts, setJobCounts] = useState([]);
    const [applicationLogs, setApplicationLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const isMounted = useRef(false);
    const isAdmin = user?.role?.[0] === 'administrator' || user?.role?.[0] === 'super_administrator';

    /**
     * Refresh the list of jobs in the queue.
     * Stores a list of pending job details.
     * {name: 'jobId', label: 'Job ID'}, 
        {name: 'status', label: 'Status'},
        {name: 'timestamp', label: 'Timestamp'},
        {name: 'finishedOn', label: 'Finished On'},
        {name: 'processedOn', label: 'Processed On'},
        {name: 'error', label: 'Error'},
        {name: 'data', label: 'Job Data'}
     *
     * @private
     * @return {Promise<void>} - Resolves when the jobs have been refreshed.
     */

        const _refreshLogs = async () => {
            setLoading(true);
            router.get('/admin/logs')
                .then(res => {
    
                    if (!res || res.error) {
                        return setMessage({
                            msg: res?.error?.msg || 'Error occurred.',
                            type: 'error'
                        });
                    }
    
                    // set logs in state
                    setApplicationLogs(res.response?.data || []);

                }).catch(err => {
                    setMessage({
                        msg: err?.message || 'Error occurred.',
                        type: 'error'
                    });
                }).finally(() => setLoading(false));
        };
    
    /**
     * Show details of a job in the pending jobs table.
     *
     * @private
     * @param {Object} job - The job to show details for
     * @param {string} job.jobId - The ID of the job
     * @param {string} job.status - The status of the job
     * @param {Date} job.timestamp - The timestamp of the job
     * @param {Date} job.finishedOn - The date and time the job finished
     * @param {Date} job.processedOn - The date and time the job was processed
     * @param {string} job.error - The error message if the job failed
     * @param {Object} job.data - The job data
     * @returns {JSX.Element} a JSX element displaying the job details
     */
    const _showDetails = (job) => {
        const { jobId, status, timestamp, finishedOn, processedOn, error, data } = job;
        const {
            src,
            owner,
            metadata,
            imageState,
            versions,
        } = JSON.parse(data) || {};
        const { file } = metadata || {};
        const { raw, thumb, medium, full } = versions || {};
        dialog.setCurrent({
            dialogID: 'show',
            model: 'jobs',
            label: `Job ${jobId} Details`,
            metadata: {
                job_id: jobId,
                status,
                timestamp,
                finished_on: finishedOn,
                processed_on: processedOn,
                error,
                filename_tmp: src || file?.filename_tmp,
                ...file,
                image_state: imageState,
                owner_id: owner?.id,
                owner_type: owner?.type,
                owner_fs_path: owner?.fs_path,
                container_id: metadata?.data?.owner_id,
                container_type: metadata?.data?.owner_type,
                container_fs_path: metadata?.data?.owner_fs_path,
                secure_token: metadata?.data?.secure_token,
                version_raw_path: raw?.path,
                version_thumb_path: thumb?.path,
                version_medium_path: medium?.path,
                version_full_path: full?.path,
            },
        });
    };

    /**
     * Retry a job with the given ID.
     *
     * @param {string} jobId - The ID of the job to retry.
     * @returns {Promise<void>} - Resolves when the job has been retried.
     *
     * This function makes a GET request to the /admin/jobs/retry/:jobId endpoint.
     * The endpoint will return the job details with the status set to 'pending'.
     * The function will then return the job details with the processedOn and finishedOn
     * timestamps converted to locale strings.
     */
    const _retryJob = async (jobId) => {
        // Display date for retry
        const display_format_options = { year: 'numeric', month: 'short', day: 'numeric' };
        const date_object = new Date(Date.now());
        const date_display = date_object.toLocaleDateString("en-US", display_format_options); // provide in specified format
        const time_display = date_object.toLocaleTimeString("en-US", {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: "America/Chicago",
            timeZoneName: 'short'
        });
        const datetime_display = `${date_display} | ${time_display.slice(0, -4)}`;

        router.get(`/admin/jobs/retry/${jobId}`)
            .then(res => {
                if (isMounted.current) {
                    if (!res || res.error) {
                        return setMessage({
                            msg: res?.error?.message || 'Error occurred.',
                            type: 'error'
                        });
                    }
                    const job = res.response?.data
                    const { status, finishedOn, processedOn } = job;
                    return {
                        id: jobId,
                        status: status,
                        processedOn: new Date(processedOn).toLocaleString(),
                        finishedOn: new Date(finishedOn).toLocaleString(),
                        details: () => { }
                    }

                }
            });
    };

    /**
     * Refresh the list of jobs in the queue.
     * Stores a list of pending job details.
     * {name: 'jobId', label: 'Job ID'}, 
        {name: 'status', label: 'Status'},
        {name: 'timestamp', label: 'Timestamp'},
        {name: 'finishedOn', label: 'Finished On'},
        {name: 'processedOn', label: 'Processed On'},
        {name: 'error', label: 'Error'},
        {name: 'data', label: 'Job Data'}
     *
     * @private
     * @return {Promise<void>} - Resolves when the jobs have been refreshed.
     */

    const _refreshJobs = async () => {
        setLoading(true);
        router.get('/admin/jobs')
            .then(res => {

                if (!res || res.error) {
                    return setMessage({
                        msg: res?.error?.msg || 'Error occurred.',
                        type: 'error'
                    });
                }

                const counts = (res.response?.data?.counts || [])
                // set jobs
                const jobs = (res.response?.data?.jobs || []).map(job => {
                    const { jobId, status, finishedOn, processedOn } = job;
                    return {
                        id: parseInt(jobId),
                        status: status,
                        finishedOn: new Date(finishedOn),
                        processedOn: new Date(processedOn),
                        details: <Button icon={'info'} onClick={() => _showDetails(job)} />,
                        retry: <Button icon={'sync'} onClick={() => _retryJob(jobId)} />
                    }
                });
                setJobCounts(counts);
                setPendingJobs(jobs);
            }).catch(err => {
                setMessage({
                    msg: err?.message || 'Error occurred.',
                    type: 'error'
                });
            }).finally(() => setLoading(false));
    };


    // check if is admin user
    useEffect(() => {
        if (!user || !isAdmin) {
            setMessage({
                msg: 'You do not have permission to view this page.',
                type: 'error'
            });
        }
        else {
            _refreshLogs();
            _refreshJobs();
        }
    }, [isAdmin, router, user]);

    return (
        <>
            {message && <UserMessage onClose={() => setMessage(null)} closeable={false} message={message} />}

            {isAdmin && <div className="admin">
                <Accordion 
                    type="logs" 
                    label="Application Logs"
                    menu={
                        <Button icon={'sync'} onClick={() => _refreshLogs()} />
                    }
                    >
                    <>{loading && <Loading label={'Loading logs...'} overlay={false} />}</>
                    {applicationLogs.length === 0 ? (
                        <div>No logs to report.</div>
                    ) : (
                        (applicationLogs || []).map((log, index) => 
                            <Accordion type="logs" key={index} label={log?.file}>
                                {log?.contents.map((line, index) => 
                                <div key={index}><code style={{whiteSpace: 'pre-wrap'}}>{line}</code></div>)}
                            </Accordion>
                    ))}
                </Accordion>

                <Accordion
                    type="jobs"
                    label="File Processing Jobs in Queue" 
                    menu={
                        <Button icon={'sync'} onClick={() => _refreshJobs()} />
                    }
                >
                    <div className="h-menu">
                        <ul>
                            <li><Badge label={`Completed: ${jobCounts['completed']}`} icon={'success'} size="lg" className="success" /></li>
                            <li><Badge label={`Active: ${jobCounts['active']}`} icon={'sync'} size="lg" className="info" /></li>
                            <li><Badge label={`Delayed: ${jobCounts['delayed']}`} icon={'warning'} size="lg" className="info" /></li>
                            <li><Badge label={`Waiting: ${jobCounts['waiting']}`} icon={'warning'} size="lg" className="info" /></li>
                            <li><Badge label={`Failed: ${jobCounts['failed']}`} icon={'error'} size="lg" className="error" /></li>
                        </ul>
                    </div>
                    <>{loading && <Loading label={'Loading jobs...'} overlay={false} />}</>
                    {pendingJobs.length === 0 ? (
                        <div>No jobs in queue.</div>
                    ) : (
                        <Table className="files" defaultSortBy="id" rows={pendingJobs} cols={[
                            { name: 'id', label: 'Job ID' },
                            { name: 'status', label: 'Status' },
                            { name: 'processedOn', label: 'Processed', datatype: 'timestamp', defaultSort: true },
                            { name: 'finishedOn', label: 'Finished', datatype: 'timestamp' },
                            { name: 'details', label: ''},
                            { name: 'retry', label: ''},
                        ]} />
                    )}
                </Accordion>
            </div>}
        </>
    );
};

export default memo(AdminView);